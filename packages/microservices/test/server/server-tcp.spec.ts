import { expect } from 'chai';
import { EventEmitter } from 'events';
import {
  AddressInfo,
  createConnection,
  Server as NetServer,
  Socket as NetSocket,
} from 'net';
import { Observable, tap } from 'rxjs';
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
    const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4;

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
});
