import { EventEmitter } from 'events';
import {
  AddressInfo,
  createConnection,
  Server as NetServer,
  Socket as NetSocket,
} from 'net';
import { Observable, of, tap, throwError as _throw } from 'rxjs';
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
    const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4;

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
});
