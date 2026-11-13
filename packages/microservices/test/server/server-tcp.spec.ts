import { EventEmitter } from 'events';
import {
  AddressInfo,
  createConnection,
  Server as NetServer,
  Socket as NetSocket,
} from 'net';
import { Observable, of, Subject, tap, throwError as _throw } from 'rxjs';
import { CallHandler } from '../../../common/index.js';
import { ApplicationConfig } from '../../../core/application-config.js';
import { GuardsConsumer } from '../../../core/guards/guards-consumer.js';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator.js';
import { NestContainer } from '../../../core/injector/container.js';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator.js';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';
import { RpcContextCreator } from '../../context/rpc-context-creator.js';
import { RpcProxy } from '../../context/rpc-proxy.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { InvalidPacketIdException } from '../../errors/invalid-packet-id.exception.js';
import { JsonSocket } from '../../helpers/json-socket.js';
import { TcpSocket } from '../../helpers/tcp-socket.js';
import { ServerTCP } from '../../server/server-tcp.js';
import { objectToMap } from './utils/object-to-map.js';

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
    let socket: { on: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      socket = { on: vi.fn() };
      vi.spyOn(server, 'getSocketInstance' as any).mockImplementation(
        () => socket,
      );
    });
    it('should bind message, error and close events to handler', () => {
      server.bindHandler(null!);
      const events = socket.on.mock.calls.map(([event]) => event);
      expect(new Set(events)).toEqual(new Set(['message', 'error', 'close']));
    });
    it('should track the accepted socket so that it can be closed on shutdown', () => {
      const netSocket = { on: vi.fn(), destroy: vi.fn() };
      server.bindHandler(netSocket as any);

      expect(untypedServer.openSockets.has(netSocket)).to.be.true;
    });
    it('should route "handleMessage" rejections to "handleError" instead of leaving them unhandled', async () => {
      const error = new Error('unexpected');
      vi.spyOn(server, 'handleMessage').mockRejectedValue(error);
      const handleErrorSpy = vi
        .spyOn(untypedServer, 'handleError')
        .mockImplementation(() => undefined);

      server.bindHandler(null!);
      const [, onMessage] = socket.on.mock.calls.find(
        ([event]) => event === 'message',
      );
      await onMessage({});

      expect(handleErrorSpy).toHaveBeenCalledWith(error);
    });
    it('should destroy a connection accepted once the server is closing, such as a TLS handshake that ended late', () => {
      const netSocket = { on: vi.fn(), destroy: vi.fn() };
      untypedServer.isManuallyTerminated = true;

      server.bindHandler(netSocket as any);

      expect(netSocket.destroy).toHaveBeenCalledOnce();
      expect(untypedServer.getSocketInstance).not.toHaveBeenCalled();
      expect(untypedServer.boundSockets.size).toBe(0);
    });
    it('should forget a bound socket once it closes', () => {
      const emitter = new EventEmitter();
      const boundSocket = { on: emitter.on.bind(emitter) };
      untypedServer.getSocketInstance.mockImplementation(() => boundSocket);

      server.bindHandler(null!);
      expect(untypedServer.boundSockets.has(boundSocket)).toBe(true);

      emitter.emit('close');
      expect(untypedServer.boundSockets.size).toBe(0);
    });
  });
  describe('close', () => {
    const tcpServer = { close: vi.fn() };
    beforeEach(() => {
      untypedServer.server = tcpServer;
    });
    it('should close server', () => {
      server.close();
      expect(tcpServer.close).toHaveBeenCalled();
    });
    it('should destroy sockets that are still open', () => {
      const openSocket = { destroy: vi.fn(), on: vi.fn() };
      untypedServer.openSockets.add(openSocket);

      server.close();

      expect(openSocket.destroy).toHaveBeenCalled();
      expect(untypedServer.openSockets.size).toEqual(0);
    });
    it('should neither wait nor return a promise without "gracefulShutdown"', () => {
      const waitSpy = vi.spyOn(untypedServer, 'waitForHandlersInFlight');

      expect(server.close()).toBeUndefined();
      expect(waitSpy).not.toHaveBeenCalled();
    });

    describe('with "gracefulShutdown"', () => {
      const nextTick = () =>
        new Promise<void>(resolve => process.nextTick(resolve));

      function createGracefulServer(options: Record<string, unknown> = {}) {
        const gracefulServer = new ServerTCP({
          gracefulShutdown: true,
          ...options,
        });
        const netServer = { close: vi.fn() };
        Object.assign(gracefulServer, { server: netServer });
        const waitSpy = vi
          .spyOn(gracefulServer as any, 'waitForHandlersInFlight')
          .mockResolvedValue(undefined);
        // A connection as "bindHandler" leaves it
        const connect = ({ pendingMessages = 0, closesOnEnd = true } = {}) => {
          const netSocket = Object.assign(new EventEmitter(), {
            destroy: vi.fn(() => void netSocket.emit('close')),
            destroySoon: vi.fn(
              () => closesOnEnd && void netSocket.emit('close'),
            ),
          });
          const socket = {
            netSocket,
            once: netSocket.once.bind(netSocket),
          };
          const {
            boundSockets,
            openSockets,
            pendingMessages: pending,
          } = gracefulServer as any;
          boundSockets.add(socket);
          openSockets.add(netSocket);
          pending.set(socket, pendingMessages);
          netSocket.on('close', () => {
            boundSockets.delete(socket);
            openSockets.delete(netSocket);
          });
          return netSocket;
        };
        return { gracefulServer, netServer, waitSpy, connect };
      }

      it('should stop accepting connections before it waits', async () => {
        const { gracefulServer, netServer, waitSpy } = createGracefulServer();

        const closing = gracefulServer.close();

        expect(netServer.close).toHaveBeenCalledOnce();
        expect(waitSpy).not.toHaveBeenCalled();
        await closing;
      });

      it('should close the connections with nothing in flight right away and keep the others open', async () => {
        const { gracefulServer, waitSpy, connect } = createGracefulServer();
        let finish!: () => void;
        waitSpy.mockReturnValue(new Promise<void>(res => (finish = res)));
        const idle = connect();
        const busy = connect({ pendingMessages: 1 });

        const closing = gracefulServer.close();
        await nextTick();

        expect(idle.destroySoon).toHaveBeenCalledOnce();
        expect(busy.destroySoon).not.toHaveBeenCalled();
        expect(busy.destroy).not.toHaveBeenCalled();

        finish();
        await closing;
      });

      it('should let the reply written on the next tick out before it closes a connection that looks idle', () => {
        const { gracefulServer, connect } = createGracefulServer();
        const idle = connect();

        void gracefulServer.close();

        expect(idle.destroySoon).not.toHaveBeenCalled();
        expect(idle.destroy).not.toHaveBeenCalled();
      });

      it('should close the other connections once the handlers in flight are done', async () => {
        const { gracefulServer, waitSpy, connect } = createGracefulServer();
        let finish!: () => void;
        waitSpy.mockReturnValue(new Promise<void>(res => (finish = res)));
        const busy = connect({ pendingMessages: 1 });

        const closing = gracefulServer.close();
        await new Promise(resolve => setImmediate(resolve));
        expect(busy.destroySoon).not.toHaveBeenCalled();

        finish();
        await closing;

        expect(busy.destroySoon).toHaveBeenCalledOnce();
        expect((gracefulServer as any).openSockets.size).toBe(0);
      });

      it('should not close a connection that became idle after the call before the handlers in flight are done', async () => {
        const { gracefulServer, waitSpy, connect } = createGracefulServer();
        let finish!: () => void;
        waitSpy.mockReturnValue(new Promise<void>(res => (finish = res)));
        const busy = connect({ pendingMessages: 1 });

        const closing = gracefulServer.close();
        // Its handler settles right away, and its reply is yet to be written
        (gracefulServer as any).pendingMessages.set(
          [...(gracefulServer as any).boundSockets][0],
          0,
        );
        await nextTick();

        expect(busy.destroySoon).not.toHaveBeenCalled();

        finish();
        await closing;
        expect(busy.destroySoon).toHaveBeenCalledOnce();
      });

      it('should wait for "gracePeriod" at most', async () => {
        const { gracefulServer, waitSpy } = createGracefulServer({
          gracePeriod: 500,
        });

        await gracefulServer.close();

        expect(waitSpy).toHaveBeenCalledExactlyOnceWith(500);
      });

      it('should destroy a connection whose peer does not read once the period is over', async () => {
        const { gracefulServer, connect } = createGracefulServer({
          gracePeriod: 50,
        });
        const stuck = connect({ pendingMessages: 1, closesOnEnd: false });

        const closeCalledAt = Date.now();
        await gracefulServer.close();

        expect(stuck.destroySoon).toHaveBeenCalledOnce();
        expect(stuck.destroy).toHaveBeenCalledOnce();
        expect(Date.now() - closeCalledAt).toBeGreaterThanOrEqual(45);
        expect((gracefulServer as any).openSockets.size).toBe(0);
      });

      it('should destroy at once what is still open when the handlers took the whole period', async () => {
        const { gracefulServer, waitSpy, connect } = createGracefulServer({
          gracePeriod: 30,
        });
        waitSpy.mockImplementation(
          () => new Promise<void>(resolve => setTimeout(resolve, 40)),
        );
        const stuck = connect({ pendingMessages: 1, closesOnEnd: false });

        await gracefulServer.close();

        expect(stuck.destroy).toHaveBeenCalledOnce();
      });

      it('should destroy a connection that was never bound, such as a TLS handshake under way', async () => {
        const { gracefulServer } = createGracefulServer();
        const handshaking = { destroy: vi.fn(), on: vi.fn() };
        (gracefulServer as any).openSockets.add(handshaking);

        await gracefulServer.close();

        expect(handshaking.destroy).toHaveBeenCalledOnce();
      });
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

          expect(socket.destroyed).toBe(true);
          await clientClosed;
        } finally {
          socket.destroy();
          client.destroy();
        }
      });
      it('should destroy them with "gracefulShutdown" as well, by the time close() resolves', async () => {
        const tlsServer = new ServerTCP({
          host: '127.0.0.1',
          port: 0,
          tlsOptions: {},
          gracefulShutdown: true,
          gracePeriod: 30_000,
        });
        await new Promise<void>((resolve, reject) =>
          tlsServer.listen(err => (err ? reject(err) : resolve())),
        );
        const netServer = tlsServer.unwrap<NetServer>();
        const accepted = new Promise<NetSocket>(resolve =>
          netServer.once('connection', resolve),
        );
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
          const closeCalledAt = Date.now();
          await tlsServer.close();

          expect(socket.destroyed).toBe(true);
          expect(Date.now() - closeCalledAt).toBeLessThan(5000);
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
      const socket = { on: vi.fn(), destroy: vi.fn() };
      untypedServer.trackOpenSocket(socket);

      expect(untypedServer.openSockets.has(socket)).to.be.true;
    });
    it('should drop the reference once the socket closes on its own', () => {
      const socket = { on: vi.fn(), destroy: vi.fn() };
      untypedServer.trackOpenSocket(socket);

      const [, onClose] = socket.on.mock.calls.find(
        ([event]) => event === 'close',
      );
      onClose();

      expect(untypedServer.openSockets.has(socket)).to.be.false;
    });
  });
  describe('listen', () => {
    let serverMock: EventEmitter & { listen: ReturnType<typeof vi.fn> };
    let statuses: string[];

    beforeEach(() => {
      serverMock = Object.assign(new EventEmitter(), { listen: vi.fn() });
      // init() keeps a permanent error listener, so later errors do not throw
      serverMock.on('error', () => {});
      untypedServer.server = serverMock;
      statuses = [];
      server.status.subscribe(status => statuses.push(status));
    });

    it.each([undefined, null, ''])(
      'should listen on localhost when "host" is %j',
      host => {
        server = new ServerTCP({ host: host as string });
        untypedServer = server as any;
        untypedServer.server = serverMock;

        server.listen(() => {});

        expect(serverMock.listen).toHaveBeenCalledWith(
          3000,
          'localhost',
          expect.any(Function),
        );
      },
    );

    it('should listen on the default port when "port" is undefined or null', () => {
      for (const port of [undefined, null]) {
        expect((new ServerTCP({ port: port as number }) as any).port).toBe(
          3000,
        );
      }
      // 0 picks a random port
      expect((new ServerTCP({ port: 0 }) as any).port).toBe(0);
    });

    it('should use JsonSocket when "socketClass" is undefined', () => {
      server = new ServerTCP({ socketClass: undefined });
      expect(server['getSocketInstance'](new NetSocket())).toBeInstanceOf(
        JsonSocket,
      );
    });

    it('should call native listen method with expected arguments', () => {
      server.listen(() => {});
      expect(serverMock.listen).toHaveBeenCalledWith(
        untypedServer.port,
        untypedServer.host,
        expect.any(Function),
      );
    });

    it('should call the callback without arguments once listening', () => {
      const callback = vi.fn();
      serverMock.listen.mockImplementation((_port, _host, onListening) =>
        onListening(),
      );

      server.listen(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith();
    });

    it.each(['EADDRINUSE', 'ECONNREFUSED', 'EACCES', 'EADDRNOTAVAIL'])(
      'should pass a "%s" listen error to the callback',
      code => {
        const callback = vi.fn();
        const error = Object.assign(new Error('listen failed'), { code });

        server.listen(callback);
        serverMock.emit('error', error);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(error);
        expect(statuses).toEqual(['disconnected']);
      },
    );

    it('should pass a listen error without a code to the callback', () => {
      const callback = vi.fn();
      const error = new Error('listen failed');

      server.listen(callback);
      serverMock.emit('error', error);

      expect(callback).toHaveBeenCalledWith(error);
    });

    describe('when the server is already listening', () => {
      let callback: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        callback = vi.fn();
        serverMock.listen.mockImplementation((_port, _host, onListening) =>
          onListening(),
        );
        server.listen(callback);
        serverMock.emit(
          'error',
          Object.assign(new Error('late'), { code: 'EACCES' }),
        );
      });

      it('should not call the callback again on a later error', () => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith();
      });

      it('should not report a later error as a failed listen', () => {
        expect(statuses).toEqual([]);
      });
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
        sendMessage: vi.fn(),
      };
    });
    it('should not dispatch a message once the server is closing', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({ [msg.pattern]: handler });
      const trackSpy = vi.spyOn(untypedServer, 'trackPendingMessage');
      untypedServer.isManuallyTerminated = true;

      await server.handleMessage(socket, msg);

      expect(handler).not.toHaveBeenCalled();
      expect(trackSpy).not.toHaveBeenCalled();
      expect(socket.sendMessage).not.toHaveBeenCalled();
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(socket, msg);
      expect(socket.sendMessage).toHaveBeenCalledWith({
        id: msg.id,
        status: 'error',
        err: NO_MESSAGE_HANDLER,
      });
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage(socket, msg);
      expect(handler).toHaveBeenCalledOnce();
    });
    it('should call the handler of a string pattern that reads as json', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({ '1.0': handler as any });
      await server.handleMessage(socket, { ...msg, pattern: '1.0' });
      expect(handler).toHaveBeenCalledOnce();
      expect(socket.sendMessage).not.toHaveBeenCalledWith({
        id: msg.id,
        status: 'error',
        err: NO_MESSAGE_HANDLER,
      });
    });
    it('should expose the packet metadata on the context', async () => {
      const handler = vi.fn();
      const metadata = { traceId: 'trace-1' };
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage(socket, { ...msg, metadata });

      const context = handler.mock.calls[0][1];
      expect(context.getMetadata()).toEqual(metadata);
    });
    it('should still reply with an event handler, but warn once that this is deprecated', async () => {
      const handler = Object.assign(async () => 'stored', {
        isEventHandler: true,
      });
      untypedServer.messageHandlers = objectToMap({ [msg.pattern]: handler });
      const warnSpy = vi
        .spyOn(untypedServer.logger, 'warn')
        .mockImplementation(() => {});

      await server.handleMessage(socket, msg);
      await server.handleMessage(socket, msg);
      await new Promise(resolve => setImmediate(resolve));

      expect(socket.sendMessage).toHaveBeenCalledTimes(2);
      expect(socket.sendMessage).toHaveBeenCalledWith({
        id: msg.id,
        response: 'stored',
        isDisposed: true,
      });
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(
        /^DEPRECATED! .* Pattern: test$/,
      );
    });
    it('should send NO_MESSAGE_HANDLER error if pattern is too deeply nested to be serialized', async () => {
      const deeplyNestedMsg = {
        ...msg,
        pattern: createDeeplyNestedObject(100_000),
      };
      await server.handleMessage(socket, deeplyNestedMsg);
      expect(socket.sendMessage).toHaveBeenCalledWith({
        id: msg.id,
        status: 'error',
        err: NO_MESSAGE_HANDLER,
      });
    });
    it('should call "handleEvent" if pattern is too deeply nested to be serialized and identifier is not present', async () => {
      const handleEventSpy = vi
        .spyOn(server, 'handleEvent')
        .mockImplementation(async () => undefined);
      const deeplyNestedEvent = {
        pattern: createDeeplyNestedObject(100_000),
        data: 'tests',
      };
      await server.handleMessage(socket, deeplyNestedEvent);
      expect(handleEventSpy).toHaveBeenCalledOnce();
    });
    it('should drop a request whose id is neither a number nor a short string', async () => {
      // Every reply carries the id, so it would be serialized for each of them
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });

      for (const id of [[[['nested']]], 'a'.repeat(257)]) {
        const error = await server
          .handleMessage(socket, { ...msg, id })
          .catch(err => err);

        expect(handler).not.toHaveBeenCalled();
        expect(socket.sendMessage).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(InvalidPacketIdException);
      }
    });
  });

  describe('processing end hook', () => {
    const msg = { pattern: 'test', data: 'tests', id: '3' };
    let socket: { sendMessage: ReturnType<typeof vi.fn> };
    let endHook: ReturnType<typeof vi.fn>;

    const bindHandler = (handler: () => unknown) => {
      endHook = vi.fn();
      untypedServer.onProcessingStartHook = (
        _transportId: unknown,
        _ctx: unknown,
        fn: () => Promise<void>,
      ) => fn();
      untypedServer.onProcessingEndHook = endHook;
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: (async () => handler()) as any,
      });
    };
    const flush = () => new Promise(resolve => setImmediate(resolve));

    beforeEach(() => {
      socket = { sendMessage: vi.fn() };
    });

    it('should run the hook once when the handler returns a plain value', async () => {
      bindHandler(() => 'response');

      await server.handleMessage(socket as any, msg);
      await flush();

      expect(endHook).toHaveBeenCalledOnce();
    });
    it('should run the hook once when the response stream emits several values', async () => {
      bindHandler(() => of('first', 'second', 'third'));

      await server.handleMessage(socket as any, msg);
      await flush();

      expect(socket.sendMessage).toHaveBeenCalledTimes(3);
      expect(endHook).toHaveBeenCalledOnce();
    });
    it('should run the hook once when the response stream fails', async () => {
      bindHandler(() => _throw(() => new Error('stream failed')));

      await server.handleMessage(socket as any, msg);
      await flush();

      expect(endHook).toHaveBeenCalledOnce();
    });
    it('should run the hook when the handler rejects', async () => {
      bindHandler(() => {
        throw new Error('handler failed');
      });

      await expect(server.handleMessage(socket as any, msg)).rejects.toThrow(
        'handler failed',
      );

      expect(endHook).toHaveBeenCalledOnce();
    });
  });

  describe('when the peer disconnects', () => {
    const msg = { pattern: 'test', data: 'tests', id: '3' };
    let socket: EventEmitter & { sendMessage: ReturnType<typeof vi.fn> };

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
      socket = Object.assign(new EventEmitter(), { sendMessage: vi.fn() });
      vi.spyOn(server, 'getSocketInstance' as any).mockReturnValue(socket);
      vi.spyOn(untypedServer, 'handleError').mockImplementation(() => {});
      server.bindHandler(null!);
    });

    it.each(['close', 'error'])(
      'should end the stream of a handler that returned an Observable on "%s"',
      async event => {
        const { stream, observable } = createStream();
        const endHook = vi.fn();
        untypedServer.onProcessingEndHook = endHook;
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => observable,
        });

        await server.handleMessage(socket as any, msg);
        expect(stream.subscribed).toBe(true);

        socket.emit(event, new Error('read ECONNRESET'));

        expect(stream.tornDown).toBe(true);
        expect(endHook).toHaveBeenCalledOnce();
      },
    );
    it('should not subscribe to an Observable returned after the peer has disconnected', async () => {
      const { stream, observable } = createStream();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: async () => observable,
      });

      socket.emit('close');
      await server.handleMessage(socket as any, msg);

      expect(stream.subscribed).toBe(false);
    });

    describe('and the packet has no id', () => {
      const event = { pattern: msg.pattern, data: msg.data };

      it.each(['close', 'error'])(
        'should end the stream of a message handler on "%s"',
        async disconnectEvent => {
          const { stream, observable } = createStream();
          const endHook = vi.fn();
          untypedServer.onProcessingEndHook = endHook;
          untypedServer.messageHandlers = objectToMap({
            [msg.pattern]: async () => observable,
          });

          await server.handleMessage(socket as any, event);
          expect(stream.subscribed).toBe(true);
          expect(endHook).not.toHaveBeenCalled();

          socket.emit(disconnectEvent, new Error('read ECONNRESET'));

          expect(stream.tornDown).toBe(true);
          expect(endHook).toHaveBeenCalledOnce();
        },
      );
      it('should not subscribe to the stream of a message handler once the peer has gone', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => observable,
        });

        socket.emit('close');
        await server.handleMessage(socket as any, event);

        expect(stream.subscribed).toBe(false);
      });
      it('should not reply with what a message handler returns', async () => {
        const endHook = vi.fn();
        untypedServer.onProcessingEndHook = endHook;
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: async () => of('first', 'second'),
        });

        await server.handleMessage(socket as any, event);
        await flush();

        expect(socket.sendMessage).not.toHaveBeenCalled();
        expect(endHook).toHaveBeenCalledOnce();
      });
      it('should leave the stream of an event handler running', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: Object.assign(async () => observable, {
            isEventHandler: true,
          }),
        });

        await server.handleMessage(socket as any, event);
        expect(stream.subscribed).toBe(true);

        socket.emit('close');

        expect(stream.tornDown).toBe(false);
      });
      it('should look the handler up only once', async () => {
        const handler = Object.assign(vi.fn(), { isEventHandler: true });
        untypedServer.messageHandlers = objectToMap({ [msg.pattern]: handler });
        const getHandlerByPattern = vi.spyOn(server, 'getHandlerByPattern');

        await server.handleMessage(socket as any, event);
        await server.handleMessage(socket as any, { pattern: 'unknown' });

        expect(handler).toHaveBeenCalledOnce();
        expect(getHandlerByPattern).toHaveBeenCalledTimes(2);
      });
    });

    describe('and the handler has an interceptor', () => {
      let interceptorWork: ReturnType<typeof vi.fn>;

      const createHandler = (handle: () => unknown) => {
        const container: any = new NestContainer();
        const interceptorsContextCreator = new InterceptorsContextCreator(
          container,
        );
        vi.spyOn(interceptorsContextCreator, 'create').mockReturnValue([
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
        return contextCreator.create(controller, handle, 'module', 'handle');
      };

      beforeEach(() => {
        interceptorWork = vi.fn();
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

        expect(interceptorWork).toHaveBeenCalledWith('value');
      });
      it('should end the stream once the handler resolves to an Observable', async () => {
        const { stream, observable } = createStream();
        untypedServer.messageHandlers = objectToMap({
          [msg.pattern]: createHandler(async () => observable),
        });

        await server.handleMessage(socket as any, msg);
        await flush();
        expect(stream.subscribed).toBe(true);

        socket.emit('close');

        expect(stream.tornDown).toBe(true);
      });
    });
  });

  describe('handleClose', () => {
    describe('pending retries', () => {
      let listen: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        vi.useFakeTimers();
        server = new ServerTCP({ retryAttempts: 2, retryDelay: 50 });
        untypedServer = server as any;
        listen = vi.fn();
        untypedServer.server = { listen, close: vi.fn() };
      });
      afterEach(() => {
        server.close();
        vi.useRealTimers();
      });

      it('should cancel an already scheduled retry on manual close', () => {
        server.handleClose();
        server.close();
        vi.advanceTimersByTime(50);
        expect(listen).not.toHaveBeenCalled();
        expect(server.handleClose()).toBeUndefined();
      });

      it('should retry normally and release the timer for the next cycle', () => {
        server.handleClose();
        vi.advanceTimersByTime(50);
        expect(listen).toHaveBeenCalledOnce();
        server.handleClose();
        vi.advanceTimersByTime(50);
        expect(listen).toHaveBeenCalledTimes(2);
        expect(server.handleClose()).toBeUndefined();
      });

      it('should coalesce close events while a retry is pending', () => {
        const timer = server.handleClose();
        expect(server.handleClose()).toBe(timer);
        vi.advanceTimersByTime(50);
        expect(listen).toHaveBeenCalledOnce();
        expect(untypedServer.retryAttemptsCount).toBe(1);
      });

      it('should count the attempts of each listen separately', () => {
        // Burn the whole retry budget of the first listen()
        server.handleClose();
        vi.advanceTimersByTime(50);
        server.handleClose();
        vi.advanceTimersByTime(50);
        expect(server.handleClose()).toBeUndefined();
        expect(untypedServer.retryAttemptsCount).toBe(2);

        // A new listen() starts a fresh window, so the connection can retry
        // again instead of staying down because the counter kept its value.
        const listeningServer: any = new EventEmitter();
        listeningServer.listen = listen;
        listeningServer.close = vi.fn();
        untypedServer.server = listeningServer;
        server.listen(() => {});

        expect(server.handleClose()).toBeDefined();
        expect(untypedServer.retryAttemptsCount).toBe(1);
      });

      it('should drop a retry armed before a new listen', () => {
        // A retry is still pending when listen() is called again
        server.handleClose();
        const staleTimer = untypedServer.retryTimer;
        expect(staleTimer).toBeDefined();

        const listeningServer: any = new EventEmitter();
        listeningServer.listen = listen;
        listeningServer.close = vi.fn();
        untypedServer.server = listeningServer;
        server.listen(() => {});

        // The stale retry must not call "listen" on the server again
        vi.advanceTimersByTime(50);
        expect(listen).toHaveBeenCalledOnce();

        // and the new listen() arms, and counts, its own retry
        const retry = server.handleClose();
        expect(retry).toBeDefined();
        expect(retry).not.toBe(staleTimer);
        expect(untypedServer.retryAttemptsCount).toBe(1);
      });
      it('should retry again for a listen that follows a manual close', () => {
        server.close();
        expect(server.handleClose()).toBeUndefined();

        const listeningServer: any = new EventEmitter();
        listeningServer.listen = listen;
        listeningServer.close = vi.fn();
        untypedServer.server = listeningServer;
        server.listen(() => {});

        expect(server.handleClose()).toBeDefined();
      });

      it('should not retry on a close event while the server is listening', () => {
        // The event of a close() that a new listen() followed
        untypedServer.server.listening = true;
        expect(server.handleClose()).toBeUndefined();
        vi.advanceTimersByTime(50);
        expect(listen).not.toHaveBeenCalled();
      });

      it('should not listen from a retry once the server listens again', () => {
        server.handleClose();
        untypedServer.server.listening = true;
        vi.advanceTimersByTime(50);
        expect(listen).not.toHaveBeenCalled();
      });
    });

    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isExplicitlyTerminated = true;
        const result = server.handleClose();
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = undefined;
        const result = server.handleClose();
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttemptsCount" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 3;
        const result = server.handleClose();
        expect(result).toBeUndefined();
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
        expect(result).toBeDefined();
      });
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler).toHaveBeenCalledWith(data, expect.any(BaseRpcContext));
    });
  });

  describe('maxBufferSize', () => {
    const DEFAULT_MAX_BUFFER_SIZE = 16 * 1024 * 1024;

    describe('when maxBufferSize is not provided', () => {
      it('should use default maxBufferSize', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    describe('when maxBufferSize is provided', () => {
      it('should use custom maxBufferSize', () => {
        const customSize = 5000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(customSize);
      });

      it('should pass maxBufferSize to JsonSocket', () => {
        const customSize = 10000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(customSize);
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
        expect(customSocket).toBeInstanceOf(CustomSocket);
        // Custom socket should not have maxBufferSize property
        expect(customSocket['maxBufferSize']).toBeUndefined();
      });
    });
  });

  describe('drainTimeout', () => {
    describe('when drainTimeout is not provided', () => {
      it('should use default drainTimeout', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['drainTimeout']).toBe(30_000);
      });
    });

    describe('when drainTimeout is provided', () => {
      it('should pass drainTimeout to JsonSocket', () => {
        const server = new ServerTCP({ drainTimeout: 5000 });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['drainTimeout']).toBe(5000);
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
        write: vi.fn(() => true),
        end: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        destroy: vi.fn(),
        writableLength: 0,
      });
    const createDeferredHandler = (isEventHandler = true) => {
      const pending: Array<() => void> = [];
      const handler = Object.assign(
        vi.fn(() => new Promise<void>(resolve => pending.push(resolve))),
        { isEventHandler },
      );
      return { handler, pending };
    };
    const event = { pattern: 'test', data: 'tests' };

    let netSocket: ReturnType<typeof createNetSocketStub>;

    const bind = (options: ConstructorParameters<typeof ServerTCP>[0]) => {
      server = new ServerTCP(options);
      untypedServer = server as any;
      vi.spyOn(untypedServer, 'handleError').mockImplementation(() => {});
      vi.spyOn(untypedServer.logger, 'error').mockImplementation(() => {});
      netSocket = createNetSocketStub();
      server.bindHandler(netSocket as any);
    };

    it('should default to 1000', () => {
      for (const maxConcurrentMessages of [undefined, NaN]) {
        expect(
          new ServerTCP({ maxConcurrentMessages })['maxConcurrentMessages'],
        ).toBe(1000);
      }
      expect(new ServerTCP({})['maxConcurrentMessages']).toBe(1000);
    });
    it('should be lifted with 0', () => {
      expect(
        new ServerTCP({ maxConcurrentMessages: 0 })['maxConcurrentMessages'],
      ).toBe(Infinity);
    });
    it('should hold the messages of a peer while that many of them are pending', async () => {
      bind({ maxConcurrentMessages: 2 });
      const { handler, pending } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(5)));
      await flush();
      expect(handler).toHaveBeenCalledTimes(2);
      // Reading goes on, so that a peer that leaves is noticed
      expect(netSocket.pause).not.toHaveBeenCalled();

      pending[0]();
      await flush();
      expect(handler).toHaveBeenCalledTimes(3);

      while (handler.mock.calls.length < 5) {
        pending.splice(0).forEach(resolve => resolve());
        await flush();
      }
      expect(handler).toHaveBeenCalledTimes(5);
    });
    it('should count a request for as long as its stream is pending', async () => {
      bind({ maxConcurrentMessages: 1 });
      const streams: Subject<unknown>[] = [];
      const handler = vi.fn(async () => {
        const stream = new Subject<unknown>();
        streams.push(stream);
        return stream;
      });
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit(
        'data',
        Buffer.from(
          frame({ ...event, id: '1' }) +
            frame({ ...event, id: '2' }) +
            frame({ ...event, id: '3' }),
        ),
      );
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);

      streams[0].next('reply');
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);

      streams[0].complete();
      await flush();
      expect(handler).toHaveBeenCalledTimes(2);

      streams[1].error(new Error('stream failed'));
      await flush();
      expect(handler).toHaveBeenCalledTimes(3);
    });
    it.each([
      ['ended the connection', true, 2],
      ['was disconnected', false, 1],
    ])(
      'should end the pending streams of a peer that %s',
      async (_, readableEnded, expectedCalls) => {
        bind({ maxConcurrentMessages: 1 });
        const handler = vi.fn(async () => new Subject<unknown>());
        untypedServer.messageHandlers = objectToMap({ test: handler });

        netSocket.emit(
          'data',
          Buffer.from(frame({ ...event, id: '1' }) + frame(event)),
        );
        await flush();
        expect(handler).toHaveBeenCalledTimes(1);

        // The stream ends with the connection, which settles the request.
        // What a peer sent before it ended the connection is still handled.
        Object.assign(netSocket, { destroyed: true, readableEnded });
        netSocket.emit('close');
        await flush();

        expect(handler).toHaveBeenCalledTimes(expectedCalls);
      },
    );
    it('should not count a message whose handler rejects any longer', async () => {
      bind({ maxConcurrentMessages: 1 });
      const handler = Object.assign(
        vi.fn(async () => {
          throw new Error('handler failed');
        }),
        { isEventHandler: true },
      );
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(3)));
      for (let i = 0; i < 3; i++) {
        await flush();
      }

      expect(handler).toHaveBeenCalledTimes(3);
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

      expect(handler).toHaveBeenCalledTimes(1);
      // The reply to the request for which there is no handler
      expect(netSocket.write).toHaveBeenCalledOnce();
    });
    it('should not count a message that fails to deserialize any longer', async () => {
      bind({ maxConcurrentMessages: 1 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });
      untypedServer.deserializer = {
        deserialize: vi
          .fn()
          .mockRejectedValueOnce(new Error('cannot deserialize'))
          .mockImplementation((packet: unknown) => packet),
      };

      netSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      await flush();
      await flush();

      expect(handler).toHaveBeenCalledOnce();
    });
    it('should count the messages a handler is yet to be started for', async () => {
      bind({ maxConcurrentMessages: 2 });
      const deserializing: Array<() => void> = [];
      untypedServer.deserializer = {
        deserialize: (packet: unknown) =>
          new Promise(resolve => deserializing.push(() => resolve(packet))),
      };
      const handler = Object.assign(vi.fn(), { isEventHandler: true });
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(5)));
      await flush();
      expect(deserializing).toHaveLength(2);

      deserializing.forEach(resolve => resolve());
      await flush();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(deserializing).toHaveLength(4);
    });
    it('should run the processing end hook before handling the next message', async () => {
      bind({ maxConcurrentMessages: 1 });
      const order: string[] = [];
      untypedServer.onProcessingEndHook = () => order.push('end hook');
      const handler = Object.assign(
        vi.fn(async () => {
          order.push('handler');
        }),
        { isEventHandler: true },
      );
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(2)));
      await flush();
      await flush();

      expect(order).toEqual(['handler', 'end hook', 'handler', 'end hook']);
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

      expect(handler).toHaveBeenCalledTimes(2);
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

      expect(handler).toHaveBeenCalledOnce();
    });
    it('should not be applied with 0', async () => {
      bind({ maxConcurrentMessages: 0 });
      const { handler } = createDeferredHandler();
      untypedServer.messageHandlers = objectToMap({ test: handler });

      netSocket.emit('data', Buffer.from(frame(event).repeat(2000)));
      await flush();

      expect(handler).toHaveBeenCalledTimes(2000);
    });
  });
});
