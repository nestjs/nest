import { EventEmitter } from 'events';
import { config, from, mergeAll, of } from 'rxjs';
import { Namespace, Server } from 'socket.io';
import { IoAdapter } from '../adapters/io-adapter.js';
import { WsProxy } from '../../websockets/context/ws-proxy.js';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler.js';
import { WebSocketsController } from '../../websockets/web-sockets-controller.js';

describe('IoAdapter', () => {
  let adapter: IoAdapter;

  beforeEach(() => {
    adapter = new IoAdapter();
  });

  describe('bindMessageHandlers', () => {
    const bindCountingHandler = (adapter: IoAdapter, socket: any) => {
      const counts = { running: 0, maxRunning: 0, handled: [] as number[] };
      adapter.bindMessageHandlers(
        socket,
        [
          {
            message: 'test-event',
            methodName: 'handleTestEvent',
            callback: async (data: number) => {
              counts.maxRunning = Math.max(counts.maxRunning, ++counts.running);
              await Promise.resolve();
              counts.running--;
              counts.handled.push(data);
            },
            isAckHandledManually: false,
          },
        ],
        (data: any) => from(data),
      );
      return counts;
    };

    it('should handle at most "maxConcurrentMessages" messages of an event at once', async () => {
      const socket = new EventEmitter() as any;
      const counts = bindCountingHandler(
        new IoAdapter(undefined, { maxConcurrentMessages: 2 }),
        socket,
      );

      // a polling payload is dispatched before any handler gets to settle
      for (let i = 0; i < 5; i++) {
        socket.emit('test-event', i);
      }
      expect(counts.running).toBe(2);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(counts.maxRunning).toBe(2);
      expect(counts.handled).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle 1000 messages of an event at once by default', () => {
      const socket = new EventEmitter() as any;
      const counts = bindCountingHandler(adapter, socket);

      for (let i = 0; i < 1001; i++) {
        socket.emit('test-event', i);
      }

      expect(counts.running).toBe(1000);
    });

    describe('when messages wait for their turn', () => {
      const connectedSocket = () => {
        const socket = new EventEmitter() as any;
        socket.connected = true;
        socket.disconnect = vi.fn(() => {
          socket.connected = false;
          socket.emit('disconnect', 'server namespace disconnect');
        });
        return socket;
      };
      const bindPendingHandler = (adapter: IoAdapter, socket: any) => {
        const callback = vi.fn(() => new Promise<never>(() => undefined));
        adapter.bindMessageHandlers(
          socket,
          [
            {
              message: 'test-event',
              methodName: 'handleTestEvent',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => from(data),
        );
        return callback;
      };

      it('should disconnect a client with more than "maxWaitingMessages" messages of an event waiting', () => {
        const socket = connectedSocket();
        const adapter = new IoAdapter(undefined, {
          maxConcurrentMessages: 1,
          maxWaitingMessages: 2,
        });
        const logWarn = vi
          .spyOn(adapter['logger'], 'warn')
          .mockImplementation(() => undefined);
        const callback = bindPendingHandler(adapter, socket);

        for (let i = 0; i < 3; i++) {
          socket.emit('test-event', i);
        }
        expect(socket.disconnect).not.toHaveBeenCalled();

        socket.emit('test-event', 3);
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(logWarn).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('should let 10000 messages of an event wait by default', () => {
        const socket = connectedSocket();
        bindPendingHandler(adapter, socket);
        vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => undefined);

        for (let i = 0; i < 1000 + 10000; i++) {
          socket.emit('test-event', i);
        }
        expect(socket.disconnect).not.toHaveBeenCalled();

        socket.emit('test-event', 'one too many');
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
      });

      it('should not let a throwing disconnect hook escape', () => {
        const socket = connectedSocket();
        const error = new Error('disconnect hook blew up');
        socket.disconnect = vi.fn(() => {
          throw error;
        });
        const adapter = new IoAdapter(undefined, {
          maxConcurrentMessages: 1,
          maxWaitingMessages: 0,
        });
        vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => undefined);
        const logError = vi
          .spyOn(adapter['logger'], 'error')
          .mockImplementation(() => undefined);
        bindPendingHandler(adapter, socket);

        socket.emit('test-event', 0);
        expect(() => socket.emit('test-event', 1)).not.toThrow();
        expect(logError).toHaveBeenCalledWith(error);
      });
    });

    describe('when a message refers to the same binary data more than once', () => {
      const bindHandler = (socket: any) => {
        const callback = vi.fn();
        adapter.bindMessageHandlers(
          socket,
          [
            {
              message: 'upload',
              methodName: 'upload',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => of(data),
        );
        return callback;
      };
      const connectedSocket = () => {
        const socket = new EventEmitter() as any;
        socket.connected = true;
        socket.disconnect = vi.fn(() => {
          socket.connected = false;
          socket.emit('disconnect', 'server namespace disconnect');
        });
        return socket;
      };

      it('should disconnect the client without handling the message', () => {
        const socket = connectedSocket();
        const logWarn = vi
          .spyOn(adapter['logger'], 'warn')
          .mockImplementation(() => undefined);
        const callback = bindHandler(socket);
        const file = Buffer.from('content');

        socket.emit('upload', { parts: [file, file] });

        expect(callback).not.toHaveBeenCalled();
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(logWarn).toHaveBeenCalledTimes(1);
      });

      it('should handle a message with distinct binary values', () => {
        const socket = connectedSocket();
        const callback = bindHandler(socket);

        socket.emit('upload', { parts: [Buffer.from('a'), Buffer.from('a')] });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(socket.disconnect).not.toHaveBeenCalled();
      });
    });

    it('should register only one disconnect listener regardless of call count', () => {
      const addListenerSpy = vi.fn();
      const fakeSocket = {
        on: addListenerSpy,
        off: vi.fn(),
        addListener: addListenerSpy,
        removeListener: vi.fn(),
      } as any;

      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: vi.fn().mockReturnValue({ data: 'response' }),
        isAckHandledManually: false,
      };

      const transform = (data: any) => of(data);

      // Call bindMessageHandlers twice on the same socket
      // (simulates two gateways sharing the same socket)
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);

      const disconnectCalls = addListenerSpy.mock.calls.filter(
        call => call[0] === 'disconnect',
      );

      expect(disconnectCalls).toHaveLength(1);

      // message handlers should still be registered per call
      const messageCalls = addListenerSpy.mock.calls.filter(
        call => call[0] === 'test-event',
      );
      expect(messageCalls).toHaveLength(2);
    });

    it('should not let a throwing handler tear down the message stream', async () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: () => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { event: 'test-event-reply', data: 'recovered' };
        },
        isAckHandledManually: false,
      };

      const replies: any[] = [];
      socket.on('test-event-reply', (payload: any) => replies.push(payload));

      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', { data: {} });
      socket.emit('test-event', { data: {} });

      expect(calls).toBe(2);
      expect(replies).toEqual(['recovered']);
    });

    it('should not ack a throwing message but keep acking the next one', () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: () => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { data: 'ok' };
        },
        isAckHandledManually: false,
      };

      const ack = vi.fn();
      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).toBe(1);
      expect(ack).not.toHaveBeenCalled();

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).toBe(2);
      expect(ack).toHaveBeenCalledWith({ data: 'ok' });
    });

    it('should not let a rejected handler tear down the message stream', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);
      const logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);

      // an app-level @Catch() filter that rethrows
      const exceptionsHandler = new WsExceptionsHandler();
      exceptionsHandler.setCustomFilters([
        {
          exceptionMetatypes: [],
          func: (exception: any) => {
            throw exception;
          },
        },
      ] as any);

      const socket = new EventEmitter() as any;
      const replies: any[] = [];
      socket.on('reply', (payload: any) => replies.push(payload));

      let calls = 0;
      const callback = new WsProxy()
        .create(
          async () => {
            if (++calls === 1) throw new Error('handler blew up');
            return { event: 'reply', data: 'ok' };
          },
          exceptionsHandler,
          'test-event',
        )
        .bind(undefined, socket);

      // same transform WebSocketsController.subscribeMessages passes in
      const transform = (data: any) =>
        from(
          WebSocketsController.prototype.pickResult.call(undefined, data),
        ).pipe(mergeAll());

      adapter.bindMessageHandlers(
        socket,
        [
          {
            message: 'test-event',
            methodName: 'm',
            callback,
            isAckHandledManually: false,
          },
        ],
        transform,
      );

      const flush = () => new Promise(resolve => setTimeout(resolve, 5));
      socket.emit('test-event', {});
      await flush();
      socket.emit('test-event', {});
      await flush();
      config.onUnhandledError = null;

      expect(calls).toBe(2);
      expect(replies).toEqual(['ok']);
      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should not let a response the encoder chokes on escape as an uncaught error', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);
      const logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);

      // stands in for socket.io's recursive packet encoder on outbound events
      const socket = new EventEmitter() as any;
      const replies: any[] = [];
      socket.emit = function (event: string, ...args: any[]) {
        if (event === 'echo-reply') {
          replies.push(JSON.parse(JSON.stringify(args[0])));
          return true;
        }
        return EventEmitter.prototype.emit.call(this, event, ...args);
      };

      adapter.bindMessageHandlers(
        socket,
        [
          {
            message: 'echo',
            methodName: 'echo',
            callback: (data: any) => ({ event: 'echo-reply', data }),
            isAckHandledManually: false,
          },
          {
            message: 'echo-ack',
            methodName: 'echoAck',
            callback: (data: any) => data,
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      const depth = 100_000;
      const deep = JSON.parse(`${'['.repeat(depth)}${']'.repeat(depth)}`);
      const ack = vi.fn((payload: any) => JSON.stringify(payload));

      socket.emit('echo', deep);
      socket.emit('echo', 'ok');
      socket.emit('echo-ack', deep, ack);
      socket.emit('echo-ack', 'ok', ack);
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(2);
      expect(logError.mock.calls[0][0]).toBeInstanceOf(RangeError);
      expect(logError.mock.calls[1][0]).toBeInstanceOf(RangeError);
      expect(replies).toEqual(['ok']);
      expect(ack).toHaveBeenLastCalledWith('ok');
    });
  });

  describe('createWithoutListener', () => {
    it('should create a server that is not attached to any port', async () => {
      const server = adapter.createWithoutListener() as Server;

      expect(server).toBeInstanceOf(Server);
      expect(server.engine).toBeUndefined();
      expect(server.httpServer).toBeUndefined();
      expect(() => server.emit('broadcast', 'to nobody')).not.toThrow();
      await adapter.close(server);
    });

    it('should create the server through "createIOServer", so that a subclass sets it up', () => {
      const customAdapter = new (class extends IoAdapter {
        public createIOServer(port: number | undefined, options?: any) {
          const server = super.createIOServer(port, options);
          server.use((_, next) => next());
          (server as any).setUp = true;
          return server;
        }
      })();
      const createIOServer = vi.spyOn(customAdapter, 'createIOServer');

      const server = customAdapter.createWithoutListener({
        connectTimeout: 1000,
      } as any) as any;

      expect(createIOServer).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ connectTimeout: 1000 }),
      );
      expect(server.setUp).toBe(true);
    });

    it('should return the namespace a gateway is declared on', () => {
      const namespace = adapter.createWithoutListener({
        namespace: '/chat',
      } as any) as Namespace;

      expect(namespace).toBeInstanceOf(Namespace);
      expect(namespace.name).toBe('/chat');
    });

    it('should close the adapters of the namespaces of such a server', async () => {
      const server = adapter.createWithoutListener() as Server;
      server.of('/chat');
      const closeAdapters = [...server._nsps.values()].map(namespace =>
        vi.spyOn(namespace.adapter, 'close'),
      );

      await adapter.close(server);

      expect(closeAdapters).toHaveLength(2);
      closeAdapters.forEach(close => expect(close).toHaveBeenCalledTimes(1));
    });
  });
});
