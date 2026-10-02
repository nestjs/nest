import { EventEmitter } from 'events';
import { Socket as NetSocket } from 'net';
import { of, throwError as _throw } from 'rxjs';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
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
    it('should bind message and error events to handler', () => {
      server.bindHandler(null!);
      expect(socket.on).toHaveBeenCalledTimes(2);
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
});
