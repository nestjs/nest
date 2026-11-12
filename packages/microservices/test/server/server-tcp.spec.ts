import { expect } from 'chai';
import { EventEmitter } from 'events';
import {
  AddressInfo,
  createConnection,
  Server as NetServer,
  Socket as NetSocket,
} from 'net';
import { Observable, of, Subject, tap } from 'rxjs';
import * as sinon from 'sinon';
import { CallHandler } from '../../../common';
import { ApplicationConfig } from '../../../core/application-config';
import { GuardsConsumer } from '../../../core/guards/guards-consumer';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator';
import { NestContainer } from '../../../core/injector/container';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { ExceptionFiltersContext } from '../../context/exception-filters-context';
import { RpcContextCreator } from '../../context/rpc-context-creator';
import { RpcProxy } from '../../context/rpc-proxy';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { InvalidPacketIdException } from '../../errors/invalid-packet-id.exception';
import { JsonSocket } from '../../helpers/json-socket';
import { TcpSocket } from '../../helpers/tcp-socket';
import { ServerTCP } from '../../server/server-tcp';
import { objectToMap } from './utils/object-to-map';

const createDeeplyNestedObject = (depth: number) => {
  let pattern: Record<string, unknown> = {};
  for (let i = 0; i < depth; i++) {
    pattern = { nested: pattern };
  }
  return pattern;
};

describe('ServerTCP', () => {
  let server: ServerTCP;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerTCP({});
    untypedServer = server as any;
  });

  describe('bindHandler', () => {
    const socket = { on: sinon.spy() };

    beforeEach(() => {
      sinon.stub(server, 'getSocketInstance' as any).callsFake(() => socket);
    });
    it('should bind message, error and close events to handler', () => {
      socket.on.resetHistory();
      server.bindHandler(null!);
      const events = socket.on.getCalls().map(call => call.args[0]);
      expect(new Set(events)).to.deep.equal(
        new Set(['message', 'error', 'close']),
      );
    });
    it('should track the accepted socket so that it can be closed on shutdown', () => {
      const netSocket = { on: sinon.spy(), destroy: sinon.spy() };
      server.bindHandler(netSocket as any);

      expect(untypedServer.openSockets.has(netSocket)).to.be.true;
    });
    it('should route "handleMessage" rejections to "handleError" instead of leaving them unhandled', async () => {
      const error = new Error('unexpected');
      sinon.stub(server, 'handleMessage').rejects(error);
      const handleErrorStub = sinon.stub(untypedServer, 'handleError');

      socket.on.resetHistory();
      server.bindHandler(null!);
      const onMessage = socket.on
        .getCalls()
        .find(call => call.args[0] === 'message')!.args[1];
      await onMessage({});

      expect(handleErrorStub.calledWith(error)).to.be.true;
    });
  });
  describe('close', () => {
    const tcpServer = { close: sinon.spy() };
    beforeEach(() => {
      untypedServer.server = tcpServer;
    });
    it('should close server', () => {
      server.close();
      expect(tcpServer.close.called).to.be.true;
    });
    it('should destroy sockets that are still open', () => {
      const openSocket = { destroy: sinon.spy(), on: sinon.spy() };
      untypedServer.openSockets.add(openSocket);

      server.close();

      expect(openSocket.destroy.called).to.be.true;
      expect(untypedServer.openSockets.size).to.equal(0);
    });
    describe('when TLS is enabled', () => {
      it('should destroy connections whose handshake is not over yet', async () => {
        const tlsServer = new ServerTCP({
          host: '127.0.0.1',
          port: 0,
          tlsOptions: {},
        });
        await new Promise<void>((resolve, reject) =>
          tlsServer.listen(err => (err ? reject(err) : resolve())),
        );
        const netServer = tlsServer.unwrap<NetServer>();
        const accepted = new Promise<NetSocket>(resolve =>
          netServer.once('connection', resolve),
        );
        // A peer that connects but never starts the TLS handshake
        const client = createConnection(
          (netServer.address() as AddressInfo).port,
          '127.0.0.1',
        );
        client.on('error', () => {});
        const clientClosed = new Promise(resolve =>
          client.once('close', resolve),
        );
        const socket = await accepted;
        try {
          tlsServer.close();

          expect(socket.destroyed).to.be.true;
          await clientClosed;
        } finally {
          socket.destroy();
          client.destroy();
        }
      });
    });
  });
  describe('trackOpenSocket', () => {
    it('should keep a reference to an accepted socket', () => {
      const socket = { on: sinon.spy(), destroy: sinon.spy() };
      untypedServer.trackOpenSocket(socket);

      expect(untypedServer.openSockets.has(socket)).to.be.true;
    });
    it('should drop the reference once the socket closes on its own', () => {
      const socket = { on: sinon.spy(), destroy: sinon.spy() };
      untypedServer.trackOpenSocket(socket);

      const onClose = socket.on
        .getCalls()
        .find(call => call.args[0] === 'close')!.args[1];
      onClose();

      expect(untypedServer.openSockets.has(socket)).to.be.false;
    });
  });
  describe('listen', () => {
    const serverMock = { listen: sinon.spy(), once: sinon.spy() };
    beforeEach(() => {
      untypedServer.server = serverMock;
    });
    afterEach(() => {
      serverMock.listen.resetHistory();
    });
    [undefined, null, ''].forEach(host => {
      it(`should listen on localhost when "host" is ${JSON.stringify(host)}`, () => {
        server = new ServerTCP({ host: host as string });
        untypedServer = server as any;
        untypedServer.server = serverMock;

        server.listen(() => {});

        expect(
          serverMock.listen.calledWith(3000, 'localhost', sinon.match.func),
        ).to.be.true;
      });
    });
    it('should listen on the default port when "port" is undefined or null', () => {
      for (const port of [undefined, null]) {
        expect(
          (new ServerTCP({ port: port as unknown as number }) as any).port,
        ).to.equal(3000);
      }
      // 0 picks a random port
      expect((new ServerTCP({ port: 0 }) as any).port).to.equal(0);
    });
    it('should use JsonSocket when "socketClass" is undefined', () => {
      server = new ServerTCP({ socketClass: undefined });
      expect(server['getSocketInstance'](new NetSocket())).to.be.instanceOf(
        JsonSocket,
      );
    });
    it('should call native listen method with expected arguments', () => {
      const callback = () => {};
      server.listen(callback);
      expect(
        serverMock.listen.calledWith(
          untypedServer.port,
          untypedServer.host,
          callback,
        ),
      ).to.be.true;
    });
  });
  describe('handleMessage', () => {
    let socket;
    const msg = {
      pattern: 'test',
      data: 'tests',
      id: '3',
    };
    beforeEach(() => {
      socket = {
        sendMessage: sinon.spy(),
      };
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(socket, msg);
      expect(
        socket.sendMessage.calledWith({
          id: msg.id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage(socket, msg);
      expect(handler.calledOnce).to.be.true;
    });
    it('should send NO_MESSAGE_HANDLER error if pattern is too deeply nested to be serialized', async () => {
      const deeplyNestedMsg = {
        ...msg,
        pattern: createDeeplyNestedObject(100_000),
      };
      await server.handleMessage(socket, deeplyNestedMsg);
      expect(
        socket.sendMessage.calledWith({
          id: msg.id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call "handleEvent" if pattern is too deeply nested to be serialized and identifier is not present', async () => {
      const handleEventStub = sinon.stub(server, 'handleEvent').resolves();
      const deeplyNestedEvent = {
        pattern: createDeeplyNestedObject(100_000),
        data: 'tests',
      };
      await server.handleMessage(socket, deeplyNestedEvent);
      expect(handleEventStub.calledOnce).to.be.true;
    });
    it('should drop a request whose id is neither a number nor a short string', async () => {
      // Every reply carries the id, so it would be serialized for each of them
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });

      for (const id of [[[['nested']]], 'a'.repeat(257)]) {
        const error = await server
          .handleMessage(socket, { ...msg, id })
          .catch(err => err);

        expect(handler.called).to.be.false;
        expect(socket.sendMessage.called).to.be.false;
        expect(error).to.be.instanceOf(InvalidPacketIdException);
      }
    });
  });
  describe('when the peer disconnects', () => {
    const msg = { pattern: 'test', data: 'tests', id: '3' };
    let socket: EventEmitter & { sendMessage: sinon.SinonSpy };

    const flush = () => new Promise(resolve => setImmediate(resolve));
    const createStream = () => {
      const stream = { subscribed: false, tornDown: false };
      const observable = new Observable(() => {
        stream.subscribed = true;
        return () => (stream.tornDown = true);
      });
      return { stream, observable };
    };

    beforeEach(() => {
      socket = Object.assign(new EventEmitter(), { sendMessage: sinon.spy() });
      sinon.stub(server, 'getSocketInstance' as any).returns(socket);
      sinon.stub(untypedServer, 'handleError');
      server.bindHandler(null!);
    });

    ['close', 'error'].forEach(event => {
      it(`should end the stream of a handler that returned an Observable on "${event}"`, async () => {
        const { stream, observable } = createStream();
        const endHook = sinon.spy();
        untypedServer.onProcessingEndHook = endHook;
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => observable,
        });

        await server.handleMessage(socket as any, msg);
        expect(stream.subscribed).to.be.true;

        socket.emit(event, new Error('read ECONNRESET'));

        expect(stream.tornDown).to.be.true;
        await flush();
        expect(endHook.calledOnce).to.be.true;
      });
    });
    it('should not subscribe to an Observable returned after the peer has disconnected', async () => {
      const { stream, observable } = createStream();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: async () => observable,
      });

      socket.emit('close');
      await server.handleMessage(socket as any, msg);

      expect(stream.subscribed).to.be.false;
    });

    describe('and the packet has no id', () => {
      const event = { pattern: msg.pattern, data: msg.data };

      ['close', 'error'].forEach(disconnectEvent => {
        it(`should end the stream of a message handler on "${disconnectEvent}"`, async () => {
          const { stream, observable } = createStream();
          const endHook = sinon.spy();
          untypedServer.onProcessingEndHook = endHook;
          untypedServer.messageHandlers = objectToMap({
            [msg.pattern]: async () => observable,
          });

          await server.handleMessage(socket as any, event);
          expect(stream.subscribed).to.be.true;
          expect(endHook.called).to.be.false;

          socket.emit(disconnectEvent, new Error('read ECONNRESET'));

          expect(stream.tornDown).to.be.true;
          expect(endHook.calledOnce).to.be.true;
        });
      });
      it('should not subscribe to the stream of a message handler once the peer has gone', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => observable,
        });

        socket.emit('close');
        await server.handleMessage(socket as any, event);

        expect(stream.subscribed).to.be.false;
      });
      it('should not reply with what a message handler returns', async () => {
        const endHook = sinon.spy();
        untypedServer.onProcessingEndHook = endHook;
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => of('first', 'second'),
        });

        await server.handleMessage(socket as any, event);
        await flush();

        expect(socket.sendMessage.called).to.be.false;
        expect(endHook.calledOnce).to.be.true;
      });
      it('should leave the stream of an event handler running', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: Object.assign(async () => observable, {
            isEventHandler: true,
          }),
        });

        await server.handleMessage(socket as any, event);
        expect(stream.subscribed).to.be.true;

        socket.emit('close');

        expect(stream.tornDown).to.be.false;
      });
      it('should look the handler up only once', async () => {
        const handler = Object.assign(sinon.spy(), { isEventHandler: true });
        untypedServer.messageHandlers = objectToMap({ [msg.pattern]: handler });
        const getHandlerByPattern = sinon.spy(server, 'getHandlerByPattern');

        await server.handleMessage(socket as any, event);
        await server.handleMessage(socket as any, { pattern: 'unknown' });

        expect(handler.calledOnce).to.be.true;
        expect(getHandlerByPattern.callCount).to.equal(2);
      });
    });

    describe('and the handler has an interceptor', () => {
      let interceptorWork: sinon.SinonSpy;

      const createHandler = (handle: () => unknown) => {
        const container: any = new NestContainer();
        const interceptorsContextCreator = new InterceptorsContextCreator(
          container,
        );
        sinon.stub(interceptorsContextCreator, 'create').returns([
          {
            intercept: (_context: unknown, next: CallHandler) =>
              next.handle().pipe(tap(value => interceptorWork(value))),
          },
        ] as any);
        const contextCreator = new RpcContextCreator(
          new RpcProxy(),
          new ExceptionFiltersContext(container, new ApplicationConfig()),
          new PipesContextCreator(container),
          new PipesConsumer(),
          new GuardsContextCreator(container),
          new GuardsConsumer(),
          interceptorsContextCreator,
          new InterceptorsConsumer(),
        );
        const controller = { handle };
        return contextCreator.create(
          controller,
          handle as any,
          'module',
          'handle',
        );
      };

      beforeEach(() => {
        interceptorWork = sinon.spy();
      });

      it('should let the interceptor finish when the handler resolves to a value', async () => {
        let resolveValue: (value: string) => void;
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: createHandler(
            () => new Promise(resolve => (resolveValue = resolve)),
          ),
        });

        await server.handleMessage(socket as any, msg);
        await flush();
        socket.emit('close');
        resolveValue!('value');
        await flush();

        expect(interceptorWork.calledWith('value')).to.be.true;
      });
      it('should end the stream once the handler resolves to an Observable', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: createHandler(async () => observable),
        });

        await server.handleMessage(socket as any, msg);
        await flush();
        expect(stream.subscribed).to.be.true;

        socket.emit('close');

        expect(stream.tornDown).to.be.true;
      });
    });
  });
  describe('handleClose', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isExplicitlyTerminated = true;
        const result = server.handleClose();
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = undefined;
        const result = server.handleClose();
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttemptsCount" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 3;
        const result = server.handleClose();
        expect(result).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedServer.options = {};
        untypedServer.isExplicitlyTerminated = false;
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 2;
        untypedServer.options.retryDelay = 3;
        const result = server.handleClose();
        expect(result).to.be.not.undefined;
      });
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler.calledWith(data)).to.be.true;
    });
  });

  describe('maxBufferSize', () => {
    const DEFAULT_MAX_BUFFER_SIZE = 16 * 1024 * 1024;

    describe('when maxBufferSize is not provided', () => {
      it('should use default maxBufferSize', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    describe('when maxBufferSize is provided', () => {
      it('should use custom maxBufferSize', () => {
        const customSize = 5000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(customSize);
      });

      it('should pass maxBufferSize to JsonSocket', () => {
        const customSize = 10000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(customSize);
      });
    });

    describe('when custom socketClass is provided', () => {
      it('should not pass maxBufferSize to custom socket class', () => {
        class CustomSocket extends TcpSocket {
          constructor(socket: any) {
            super(socket);
          }
          protected handleSend() {}
          protected handleData() {}
        }

        const server = new ServerTCP({
          socketClass: CustomSocket as any,
          maxBufferSize: 5000,
        });
        const socket = new NetSocket();
        const customSocket = server['getSocketInstance'](socket);
        expect(customSocket).to.be.instanceOf(CustomSocket);
        // Custom socket should not have maxBufferSize property
        expect(customSocket['maxBufferSize']).to.be.undefined;
      });
    });
  });

  describe('drainTimeout', () => {
    describe('when drainTimeout is not provided', () => {
      it('should use default drainTimeout', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['drainTimeout']).to.equal(30_000);
      });
    });

    describe('when drainTimeout is provided', () => {
      it('should pass drainTimeout to JsonSocket', () => {
        const server = new ServerTCP({ drainTimeout: 5000 });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['drainTimeout']).to.equal(5000);
      });
    });
  });

  describe('maxConcurrentMessages', () => {
    const frame = (packet: unknown) => {
      const json = JSON.stringify(packet);
      return `${json.length}#${json}`;
    };
    const flush = () => new Promise(resolve => setImmediate(resolve));
    const createNetSocketStub = () =>
      Object.assign(new EventEmitter(), {
        write: sinon.stub().returns(true),
        end: sinon.stub(),
        pause: sinon.stub(),
        resume: sinon.stub(),
        destroy: sinon.stub(),
        writableLength: 0,
      });
    const createDeferredHandler = (isEventHandler = true) => {
      const pending: Array<() => void> = [];
      const handler = Object.assign(
        sinon.spy(() => new Promise<void>(resolve => pending.push(resolve))),
        { isEventHandler },
      );
      return { handler, pending };
    };
    const event = { pattern: 'test', data: 'tests' };

    let netSocket: ReturnType<typeof createNetSocketStub>;

    const bind = (options: ConstructorParameters<typeof ServerTCP>[0]) => {
      server = new ServerTCP(options);
      untypedServer = server as any;
      sinon.stub(untypedServer, 'handleError');
      sinon.stub(untypedServer.logger, 'error');
      netSocket = createNetSocketStub();
      server.bindHandler(netSocket as any);
    };

    it('should default to 1000', () => {
      for (const maxConcurrentMessages of [undefined, NaN]) {
        expect(
          new ServerTCP({ maxConcurrentMessages })['maxConcurrentMessages'],
        ).to.equal(1000);
      }
      expect(new ServerTCP({})['maxConcurrentMessages']).to.equal(1000);
    });
    it('should be lifted with 0', () => {
      expect(
        new ServerTCP({ maxConcurrentMessages: 0 })['maxConcurrentMessages'],
      ).to.equal(Infinity);
    });
    it('should hold the messages of a peer while that many of them are pending', async () => {
      bind({ maxConcurrentMessages: 2 });
      const { handler, pending } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(5)));
      await flush();
      expect(handler.callCount).to.equal(2);
      // Reading goes on, so that a peer that leaves is noticed
      expect(netSocket.pause.called).to.be.false;

      pending[0]();
      await flush();
      expect(handler.callCount).to.equal(3);

      while (handler.callCount < 5) {
        pending.splice(0).forEach(resolve => resolve());
        await flush();
      }
      expect(handler.callCount).to.equal(5);
    });
    it('should count a request for as long as its stream is pending', async () => {
      bind({ maxConcurrentMessages: 1 });
      const streams: Subject<unknown>[] = [];
      const handler = sinon.spy(async () => {
        const stream = new Subject<unknown>();
        streams.push(stream);
        return stream;
      });
      untypedServer.messageHandlers = objectToMap({ test: handler as any });

      netSocket.emit(
        'data',
        Buffer.from(
          frame({ ...event, id: '1' }) +
            frame({ ...event, id: '2' }) +
            frame({ ...event, id: '3' }),
        ),
      );
      await flush();
      expect(handler.callCount).to.equal(1);

      streams[0].next('reply');
      await flush();
      expect(handler.callCount).to.equal(1);

      streams[0].complete();
      await flush();
      expect(handler.callCount).to.equal(2);

      streams[1].error(new Error('stream failed'));
      await flush();
      expect(handler.callCount).to.equal(3);
    });
    (
      [
        ['ended the connection', true, 2],
        ['was disconnected', false, 1],
      ] as const
    ).forEach(([description, readableEnded, expectedCalls]) => {
      it(`should end the pending streams of a peer that ${description}`, async () => {
        bind({ maxConcurrentMessages: 1 });
        const handler = sinon.spy(async () => new Subject<unknown>());
        untypedServer.messageHandlers = objectToMap({ test: handler as any });

        netSocket.emit(
          'data',
          Buffer.from(frame({ ...event, id: '1' }) + frame(event)),
        );
        await flush();
        expect(handler.callCount).to.equal(1);

        // The stream ends with the connection, which settles the request.
        // What a peer sent before it ended the connection is still handled.
        Object.assign(netSocket, { destroyed: true, readableEnded });
        netSocket.emit('close');
        await flush();

        expect(handler.callCount).to.equal(expectedCalls);
      });
    });
    it('should not count a message whose handler rejects any longer', async () => {
      bind({ maxConcurrentMessages: 1 });
      const handler = Object.assign(
        sinon.spy(async () => {
          throw new Error('handler failed');
        }),
        { isEventHandler: true },
      );
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(3)));
      for (let i = 0; i < 3; i++) {
        await flush();
      }

      expect(handler.callCount).to.equal(3);
    });
    it('should not count messages that no handler is started for', async () => {
      bind({ maxConcurrentMessages: 1 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit(
        'data',
        Buffer.from(
          frame({ pattern: 'unknown' }) +
            frame({ pattern: 'unknown', id: '1' }) +
            frame({ pattern: 'test', id: [['nested']] }) +
            frame(event) +
            frame(event),
        ),
      );
      for (let i = 0; i < 5; i++) {
        await flush();
      }

      expect(handler.callCount).to.equal(1);
      // The reply to the request for which there is no handler
      expect(netSocket.write.calledOnce).to.be.true;
    });
    it('should not count a message that fails to deserialize any longer', async () => {
      bind({ maxConcurrentMessages: 1 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });
      const deserialize = sinon.stub().callsFake((packet: unknown) => packet);
      deserialize.onFirstCall().rejects(new Error('cannot deserialize'));
      untypedServer.deserializer = { deserialize };

      netSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      await flush();
      await flush();

      expect(handler.calledOnce).to.be.true;
    });
    it('should count the messages a handler is yet to be started for', async () => {
      bind({ maxConcurrentMessages: 2 });
      const deserializing: Array<() => void> = [];
      untypedServer.deserializer = {
        deserialize: (packet: unknown) =>
          new Promise(resolve => deserializing.push(() => resolve(packet))),
      };
      const handler = Object.assign(sinon.spy(), { isEventHandler: true });
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(5)));
      await flush();
      expect(deserializing).to.have.lengthOf(2);

      deserializing.forEach(resolve => resolve());
      await flush();
      expect(handler.callCount).to.equal(2);
      expect(deserializing).to.have.lengthOf(4);
    });
    it('should run the processing end hook before handling the next message', async () => {
      bind({ maxConcurrentMessages: 1 });
      const order: string[] = [];
      untypedServer.onProcessingEndHook = () => order.push('end hook');
      const handler = Object.assign(
        sinon.spy(async () => {
          order.push('handler');
        }),
        { isEventHandler: true },
      );
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      await flush();
      await flush();

      expect(order).to.deep.equal([
        'handler',
        'end hook',
        'handler',
        'end hook',
      ]);
    });
    it('should count the messages of each peer separately', async () => {
      bind({ maxConcurrentMessages: 1 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });
      const otherNetSocket = createNetSocketStub();
      server.bindHandler(otherNetSocket as any);

      netSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      otherNetSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      await flush();

      expect(handler.callCount).to.equal(2);
    });
    it('should not handle what was held once the server is closed', async () => {
      bind({ maxConcurrentMessages: 1 });
      const { handler, pending } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(3)));
      await flush();
      // The peer had ended the connection, so there is no socket left to
      // destroy
      Object.assign(netSocket, { destroyed: true, readableEnded: true });
      netSocket.emit('close');
      server.close();
      pending[0]();
      await flush();

      expect(handler.calledOnce).to.be.true;
    });
    it('should not be applied with 0', async () => {
      bind({ maxConcurrentMessages: 0 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(2000)));
      await flush();

      expect(handler.callCount).to.equal(2000);
    });
  });
});
