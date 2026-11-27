import { EventEmitter, once } from 'events';
import { createServer, get } from 'http';
import type { AddressInfo } from 'net';
import { config, from, mergeAll, of } from 'rxjs';
import { Namespace, Server, type ServerOptions } from 'socket.io';
import { IoAdapter } from '../adapters/io-adapter.js';
import { WsProxy } from '../../websockets/context/ws-proxy.js';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler.js';
import { WebSocketsController } from '../../websockets/web-sockets-controller.js';

describe('IoAdapter', () => {
  let adapter: IoAdapter;

  beforeEach(() => {
    adapter = new IoAdapter();
  });

  describe('limits', () => {
    it('should use the defaults for limits that are not numbers', () => {
      const withNaN = new IoAdapter(undefined, {
        maxConcurrentMessages: NaN,
        maxWaitingMessages: NaN,
      });

      for (const key of [
        'maxConcurrentMessages',
        'maxWaitingMessages',
      ] as const) {
        expect(withNaN[key]).toBe(adapter[key]);
        expect(withNaN[key]).toBeGreaterThan(0);
      }
    });

    it('should keep 0 and Infinity', () => {
      const custom = new IoAdapter(undefined, {
        maxConcurrentMessages: Infinity,
        maxWaitingMessages: 0,
      });

      expect(custom['maxConcurrentMessages']).toBe(Infinity);
      expect(custom['maxWaitingMessages']).toBe(0);
    });
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

      // JSON.stringify throws on a BigInt on every Node.js version. A value
      // nested deeper than it can recurse is not enough: from Node.js 26 on,
      // it serializes values of any depth.
      const unserializable = { limit: 10n };
      const ack = vi.fn((payload: any) => JSON.stringify(payload));

      socket.emit('echo', unserializable);
      socket.emit('echo', 'ok');
      socket.emit('echo-ack', unserializable, ack);
      socket.emit('echo-ack', 'ok', ack);
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(2);
      expect(logError.mock.calls[0][0]).toBeInstanceOf(TypeError);
      expect(logError.mock.calls[1][0]).toBeInstanceOf(TypeError);
      expect(replies).toEqual(['ok']);
      expect(ack).toHaveBeenLastCalledWith('ok');
    });
  });

  describe('allowRequest', () => {
    const getFreePort = async () => {
      const probe = createServer();
      await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
      const { port } = probe.address() as AddressInfo;
      await new Promise(resolve => probe.close(resolve));
      return port;
    };
    // The answer to the first request of a client
    const handshake = (port: number, transport: 'polling' | 'websocket') =>
      new Promise<{ status?: number; body: string }>((resolve, reject) => {
        const request = get({
          host: '127.0.0.1',
          port,
          path: `/socket.io/?EIO=4&transport=${transport}`,
          agent: false,
          headers:
            transport === 'websocket'
              ? {
                  Connection: 'Upgrade',
                  Upgrade: 'websocket',
                  'Sec-WebSocket-Version': '13',
                  'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                }
              : {},
        });
        request.once('upgrade', (response, socket) => {
          resolve({ status: response.statusCode, body: '' });
          socket.destroy();
        });
        request.once('response', response => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', chunk => (body += chunk));
          response.once('end', () =>
            resolve({ status: response.statusCode, body }),
          );
        });
        request.once('error', reject);
      });
    // What engine.io answers when "allowRequest" calls back with "false"
    const refused = { polling: 403, websocket: 400 };
    let logError: ReturnType<typeof vi.spyOn>;
    let cleanUp: Array<() => Promise<unknown>>;

    beforeEach(() => {
      cleanUp = [];
    });
    afterEach(async () => {
      for (const step of cleanUp.reverse()) {
        await step();
      }
    });

    // A port of its own, where socket.io creates the HTTP server, or the HTTP
    // server of the application
    const layouts = {
      'on a port of its own': async (
        options: Partial<ServerOptions>,
        Adapter = IoAdapter,
      ) => {
        const adapter = new Adapter();
        logError = vi
          .spyOn(adapter['logger'], 'error')
          .mockImplementation(() => undefined);
        const server = adapter.create(
          await getFreePort(),
          options as ServerOptions,
        ) as Server;
        cleanUp.push(() => adapter.close(server));
        await once(server.httpServer, 'listening');
        return (server.httpServer.address() as AddressInfo).port;
      },
      'on the HTTP server': async (
        options: Partial<ServerOptions>,
        Adapter = IoAdapter,
      ) => {
        const httpServer = createServer();
        const adapter = new Adapter(httpServer);
        logError = vi
          .spyOn(adapter['logger'], 'error')
          .mockImplementation(() => undefined);
        const server = adapter.create(0, options as ServerOptions) as Server;
        await new Promise<void>(resolve =>
          httpServer.listen(0, '127.0.0.1', resolve),
        );
        cleanUp.push(() => adapter.close(server));
        return (httpServer.address() as AddressInfo).port;
      },
    };

    describe.each(Object.entries(layouts))('%s', (_, listen) => {
      it('should refuse a client when "allowRequest" throws', async () => {
        const error = new Error('no authorization header');
        const port = await listen({
          allowRequest: () => {
            throw error;
          },
        });

        const polling = await handshake(port, 'polling');
        expect(polling.status).toBe(refused.polling);
        expect(polling.body).not.toContain(error.message);
        expect((await handshake(port, 'websocket')).status).toBe(
          refused.websocket,
        );
        expect(logError).toHaveBeenCalledTimes(2);
        expect(logError).toHaveBeenCalledWith(error);
      });

      it('should refuse a client when the promise of "allowRequest" rejects', async () => {
        const error = new Error('token store unreachable');
        const port = await listen({
          allowRequest: async () => {
            throw error;
          },
        });

        const polling = await handshake(port, 'polling');
        expect(polling.status).toBe(refused.polling);
        expect(polling.body).not.toContain(error.message);
        expect((await handshake(port, 'websocket')).status).toBe(
          refused.websocket,
        );
        expect(logError).toHaveBeenCalledTimes(2);
        expect(logError).toHaveBeenCalledWith(error);
      });

      it('should refuse a client when "allowRequest" set by a subclass rejects', async () => {
        const error = new Error('jwt malformed');
        const check = async () => {
          throw error;
        };
        // as an adapter that authenticates clients overrides it
        class AuthenticatingAdapter extends IoAdapter {
          public createIOServer(port: number, options?: ServerOptions) {
            options!.allowRequest = check;
            return super.createIOServer(port, options);
          }
        }
        const port = await listen({}, AuthenticatingAdapter);

        expect((await handshake(port, 'polling')).status).toBe(refused.polling);
        expect(logError).toHaveBeenCalledWith(error);
      });

      it('should not answer again when "allowRequest" throws after calling back', async () => {
        const error = new Error('audit log unreachable');
        const port = await listen({
          allowRequest: (_: unknown, callback: Function) => {
            callback(null, true);
            throw error;
          },
        });

        expect((await handshake(port, 'polling')).status).toBe(200);
        expect((await handshake(port, 'websocket')).status).toBe(101);
        expect(logError).toHaveBeenCalledWith(error);
      });

      it('should pass on what "allowRequest" answers again once engine.io has thrown on its answer', async () => {
        // as when a listener of "connection_error" throws on a refusal
        class ListeningAdapter extends IoAdapter {
          public createIOServer(port: number, options?: ServerOptions) {
            const server = super.createIOServer(port, options);
            server.engine.on('connection_error', ({ context }: any) => {
              if (!context?.message) {
                throw new Error('metrics unreachable');
              }
            });
            return server;
          }
        }
        const port = await listen(
          {
            allowRequest: (_: unknown, callback: Function) => {
              try {
                callback(null, false);
              } catch {
                callback('refused again', false);
              }
            },
          },
          ListeningAdapter,
        );

        const polling = await handshake(port, 'polling');
        expect(polling.status).toBe(refused.polling);
        expect(polling.body).toContain('refused again');
        const websocket = await handshake(port, 'websocket');
        expect(websocket.status).toBe(refused.websocket);
        expect(websocket.body).toBe('refused again');
        expect(logError).not.toHaveBeenCalled();
      });

      it('should still accept a client "allowRequest" calls back for', async () => {
        const port = await listen({
          cors: { credentials: true },
          // reads an option of the server, as engine.io calls it on them
          allowRequest: function (this: any, _: unknown, callback: Function) {
            setImmediate(() => callback(null, this.cors.credentials === true));
          },
        });

        expect((await handshake(port, 'polling')).status).toBe(200);
        expect((await handshake(port, 'websocket')).status).toBe(101);
        expect(logError).not.toHaveBeenCalled();
      });
    });

    it('should not take an error engine.io throws on the answer for one of "allowRequest"', () => {
      const adapter = new IoAdapter();
      logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);
      const { allowRequest } = adapter['guardAllowRequest']({
        allowRequest: (_, callback) => callback(null, true),
      });
      // as when a listener of "initial_headers" throws on a WebSocket handshake
      const error = new Error('cannot write the headers');
      const callback = vi.fn(() => {
        throw error;
      });

      expect(() => allowRequest!({} as any, callback)).toThrow(error);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(logError).not.toHaveBeenCalled();
    });

    it('should not take an error "allowRequest" throws in place of the one engine.io throws on the answer', () => {
      const adapter = new IoAdapter();
      logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);
      const replaced = new Error('the client could not be answered');
      const { allowRequest } = adapter['guardAllowRequest']({
        allowRequest: (_, callback) => {
          try {
            callback(null, true);
          } catch {
            throw replaced;
          }
        },
      });
      const callback = vi.fn(() => {
        throw new Error('cannot write the headers');
      });

      expect(() => allowRequest!({} as any, callback)).toThrow(replaced);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(logError).not.toHaveBeenCalled();
    });

    it('should let the promise of an async "allowRequest" reject with the error engine.io throws on its answer', async () => {
      const adapter = new IoAdapter();
      logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);
      const { allowRequest } = adapter['guardAllowRequest']({
        allowRequest: async (_, callback) => callback(null, true),
      });
      const error = new Error('cannot write the headers');
      const callback = vi.fn(() => {
        throw error;
      });
      const unhandled = vi.fn();
      process.on('unhandledRejection', unhandled);
      try {
        allowRequest!({} as any, callback);
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(unhandled).toHaveBeenCalledWith(error, expect.any(Promise));
      } finally {
        process.off('unhandledRejection', unhandled);
      }
      expect(callback).toHaveBeenCalledTimes(1);
      expect(logError).not.toHaveBeenCalled();
    });

    it('should leave alone what "allowRequest" returns unless it is a promise', async () => {
      const adapter = new IoAdapter();
      logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);
      // as a query that runs again when "then" is called, and fails
      const then = vi.fn((_: unknown, reject: Function) =>
        reject(new Error('query was already executed')),
      );
      // whose prototype cannot be read
      const { proxy, revoke } = Proxy.revocable({}, {});
      revoke();

      for (const returned of [{ then }, proxy]) {
        const { allowRequest } = adapter['guardAllowRequest']({
          allowRequest: ((_: unknown, callback: Function) => {
            callback(null, true);
            return returned;
          }) as any,
        });
        const callback = vi.fn();

        expect(() => allowRequest!({} as any, callback)).not.toThrow();
        await new Promise(resolve => setImmediate(resolve));
        expect(callback).toHaveBeenCalledExactlyOnceWith(null, true);
      }
      expect(then).not.toHaveBeenCalled();
      expect(logError).not.toHaveBeenCalled();
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
