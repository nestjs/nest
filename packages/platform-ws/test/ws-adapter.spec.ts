import { EventEmitter, once } from 'events';
import { createServer } from 'http';
import { type AddressInfo, connect } from 'net';
import type { Duplex } from 'stream';
import {
  config,
  from,
  isObservable,
  lastValueFrom,
  mergeAll,
  of,
  Subject,
  toArray,
  type Observable,
} from 'rxjs';
import { WebSocket } from 'ws';
import { WsAdapter } from '../adapters/ws-adapter.js';
import { WsProxy } from '../../websockets/context/ws-proxy.js';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler.js';
import { WebSocketsController } from '../../websockets/web-sockets-controller.js';

describe('WsAdapter', () => {
  describe('bindMessageHandler', () => {
    const collect = (source: Observable<any>) =>
      lastValueFrom(source.pipe(toArray()));
    const transform = (data: any) => of(data);
    const frame = (payload: unknown) => ({ data: JSON.stringify(payload) });
    const handlersFor = (event: string, callback: (...args: any[]) => any) =>
      new Map([
        [
          event,
          {
            message: event,
            methodName: event,
            callback,
            isAckHandledManually: false,
          },
        ],
      ]) as any;
    const silenceLogger = (adapter: WsAdapter) =>
      vi.spyOn(adapter['logger'], 'error').mockImplementation(() => undefined);

    it('should report a custom message parser that throws', async () => {
      const adapter = new WsAdapter(undefined, {
        messageParser: () => {
          throw new Error('parser blew up');
        },
      });
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'anything' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should report a throwing parser installed through setMessageParser', async () => {
      const adapter = new WsAdapter();
      adapter.setMessageParser(() => {
        throw new Error('parser blew up');
      });
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'anything' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should stay silent when the default parser rejects a malformed frame', async () => {
      const adapter = new WsAdapter();
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'not json' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).not.toHaveBeenCalled();
    });

    it('should drop an unregistered event without invoking any handler', async () => {
      const adapter = new WsAdapter();
      const callback = vi.fn();
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'nope', data: {} }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
      expect(logError).not.toHaveBeenCalled();
    });

    it('should drop the frame when the parser returns nothing', async () => {
      const adapter = new WsAdapter(undefined, {
        messageParser: () => undefined,
      });
      const callback = vi.fn();

      const result = await collect(
        adapter.bindMessageHandler(
          { data: 'anything' },
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should invoke the registered handler with the payload and the event name', async () => {
      const adapter = new WsAdapter();
      const callback = vi.fn().mockReturnValue('reply');

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'known', data: { a: 1 } }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(callback).toHaveBeenCalledWith({ a: 1 }, 'known');
      expect(result).toEqual(['reply']);
    });

    it('should not let a throwing handler tear down the message stream', async () => {
      const adapter = new WsAdapter();
      const callback = () => {
        throw new Error('handler blew up');
      };

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'known', data: {} }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
    });
  });

  describe('bindMessageHandlers', () => {
    const frame = (payload: unknown) => ({ data: JSON.stringify(payload) });
    const bindCountingHandler = (adapter: WsAdapter, client: any) => {
      const counts = { running: 0, maxRunning: 0, handled: [] as number[] };
      adapter.bindMessageHandlers(
        client,
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
    const openClient = () => {
      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      client.send = vi.fn();
      return client;
    };

    it('should handle at most "maxConcurrentMessages" messages of a client at once', async () => {
      const client = openClient();
      const counts = bindCountingHandler(
        new WsAdapter(undefined, { maxConcurrentMessages: 2 }),
        client,
      );

      for (let i = 0; i < 5; i++) {
        client.emit('message', frame({ event: 'test-event', data: i }));
      }
      expect(counts.running).toBe(2);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(counts.maxRunning).toBe(2);
      expect(counts.handled).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle 1000 messages of a client at once by default', () => {
      const client = openClient();
      const counts = bindCountingHandler(new WsAdapter(), client);

      for (let i = 0; i < 1001; i++) {
        client.emit('message', frame({ event: 'test-event', data: i }));
      }

      expect(counts.running).toBe(1000);
    });

    describe('flow control', () => {
      const pausableClient = () => {
        const client = openClient();
        client.bufferedAmount = 0;
        client.pause = vi.fn();
        client.resume = vi.fn();
        client.terminate = vi.fn(() => (client.readyState = 2)); // CLOSING_STATE
        client.sendCallbacks = [] as Array<() => void>;
        client.send = vi.fn((_: string, callback: () => void) =>
          client.sendCallbacks.push(callback),
        );
        return client;
      };
      const bindHandler = (
        adapter: WsAdapter,
        client: any,
        callback: (...args: any[]) => any,
      ) =>
        adapter.bindMessageHandlers(
          client,
          [
            {
              message: 'event',
              methodName: 'event',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => (isObservable(data) ? data : of(data)),
        );

      it('should stop reading from a client while replies it has not read pile up', () => {
        const client = pausableClient();
        bindHandler(new WsAdapter(), client, () => 'reply');

        // the client reads nothing, so what is sent to it stays queued
        client.bufferedAmount = 2 * 1024 * 1024;
        client.emit('message', frame({ event: 'event' }));
        client.emit('message', frame({ event: 'event' }));
        expect(client.send).toHaveBeenCalledTimes(2);
        expect(client.pause).toHaveBeenCalledTimes(1);

        client.sendCallbacks[0]();
        expect(client.resume).not.toHaveBeenCalled();

        // the replies are out, whatever else may still be queued
        client.sendCallbacks[1]();
        expect(client.resume).toHaveBeenCalledTimes(1);
      });

      it('should stop reading from a client while its messages wait for their turn', () => {
        const client = pausableClient();
        const replies: Subject<string>[] = [];
        bindHandler(
          new WsAdapter(undefined, { maxConcurrentMessages: 1 }),
          client,
          () => {
            const reply$ = new Subject<string>();
            replies.push(reply$);
            return reply$;
          },
        );

        client.emit('message', frame({ event: 'event' }));
        expect(client.pause).not.toHaveBeenCalled();
        client.emit('message', frame({ event: 'event' }));
        expect(client.pause).toHaveBeenCalledTimes(1);

        replies[0].complete();
        expect(replies).toHaveLength(2);
        expect(client.resume).toHaveBeenCalledTimes(1);
      });

      it('should close a client once more than "maxSendBufferSize" bytes are queued for it', () => {
        const client = pausableClient();
        const adapter = new WsAdapter(undefined, { maxSendBufferSize: 1024 });
        const logWarn = vi
          .spyOn(adapter['logger'], 'warn')
          .mockImplementation(() => undefined);
        client.send = vi.fn(
          (payload: string) => (client.bufferedAmount += payload.length),
        );
        bindHandler(adapter, client, () => 'x'.repeat(1024));

        client.emit('message', frame({ event: 'event' }));

        expect(client.terminate).toHaveBeenCalledTimes(1);
        expect(logWarn).toHaveBeenCalledTimes(1);
      });

      it('should not handle the messages of a client with more than "maxSendBufferSize" bytes queued', () => {
        const client = pausableClient();
        const callback = vi.fn();
        const adapter = new WsAdapter(undefined, { maxSendBufferSize: 1024 });
        vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => undefined);
        bindHandler(adapter, client, callback);

        // e.g. what exception filters sent to a client that reads nothing
        client.bufferedAmount = 1025;
        client.emit('message', frame({ event: 'event' }));

        expect(callback).not.toHaveBeenCalled();
        expect(client.terminate).toHaveBeenCalledTimes(1);
      });

      it('should let 128 MB be queued for a client by default', () => {
        const client = pausableClient();
        const callback = vi.fn();
        const adapter = new WsAdapter();
        vi.spyOn(adapter['logger'], 'warn').mockImplementation(() => undefined);
        bindHandler(adapter, client, callback);

        client.bufferedAmount = 128 * 1024 * 1024;
        client.emit('message', frame({ event: 'event' }));
        expect(client.terminate).not.toHaveBeenCalled();

        client.bufferedAmount++;
        client.emit('message', frame({ event: 'event' }));
        expect(callback).toHaveBeenCalledTimes(1);
        expect(client.terminate).toHaveBeenCalledTimes(1);
      });

      it('should pace a real client that reads its replies slowly', async () => {
        const adapter = new WsAdapter();
        const server = adapter.create(0);
        const reply = 'x'.repeat(64 * 1024);
        server.on('connection', (client: any) =>
          bindHandler(adapter, client, () => reply),
        );
        await once(server, 'listening');
        const connected = once(server, 'connection');
        const client = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
        try {
          await once(client, 'open');
          const [serverClient] = await connected;
          const pause = vi.spyOn(serverClient, 'pause');
          const resume = vi.spyOn(serverClient, 'resume');

          // 6.4 MB of replies, more than the socket buffers hold
          const count = 100;
          client.pause();
          for (let i = 0; i < count; i++) {
            client.send(JSON.stringify({ event: 'event' }));
          }
          await vi.waitFor(() => expect(pause).toHaveBeenCalled());

          let received = 0;
          client.on('message', () => received++);
          client.resume();
          await vi.waitFor(() => expect(received).toBe(count));
          expect(resume).toHaveBeenCalled();
        } finally {
          client.terminate();
          await adapter.close(server);
          await adapter.dispose();
        }
      });
    });

    it('should not let a rejecting handler tear down the message stream', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);

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

      const adapter = new WsAdapter();
      const logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);

      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      const replies: any[] = [];
      client.send = (payload: string) => replies.push(JSON.parse(payload));

      let calls = 0;
      const callback = new WsProxy()
        .create(
          async () => {
            if (++calls === 1) throw new Error('handler blew up');
            return 'ok';
          },
          exceptionsHandler,
          'known',
        )
        .bind(undefined, client);

      // same transform WebSocketsController.subscribeMessages passes in
      const realTransform = (data: any) =>
        from(
          WebSocketsController.prototype.pickResult.call(undefined, data),
        ).pipe(mergeAll());

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'known',
            methodName: 'm',
            callback,
            isAckHandledManually: false,
          },
        ],
        realTransform,
      );

      client.emit('message', frame({ event: 'known', data: {} }));
      await new Promise(resolve => setTimeout(resolve, 5));
      client.emit('message', frame({ event: 'known', data: {} }));
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(calls).toBe(2);
      expect(replies).toEqual(['ok']);
      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should not let an unserializable response escape as an uncaught error', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);

      const adapter = new WsAdapter();
      const logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);

      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      const replies: any[] = [];
      client.send = (payload: string) => replies.push(JSON.parse(payload));

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'echo',
            methodName: 'echo',
            callback: (data: any) => ({ event: 'echo', data }),
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      // JSON.parse accepts this, JSON.stringify overflows the stack on it
      const depth = 100_000;
      client.emit('message', {
        data: `{"event":"echo","data":${'['.repeat(depth)}${']'.repeat(depth)}}`,
      });
      client.emit('message', frame({ event: 'echo', data: 'ok' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError.mock.calls[0][0]).toBeInstanceOf(RangeError);
      expect(replies).toEqual([{ event: 'echo', data: 'ok' }]);
    });

    it('should not handle messages from a client the server has started closing', () => {
      const adapter = new WsAdapter();
      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      client.send = vi.fn();
      const callback = vi.fn().mockReturnValue('reply');

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'push',
            methodName: 'push',
            callback,
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      client.emit('message', frame({ event: 'push', data: 1 }));
      // e.g. handleConnection() called client.close(): ws still emits what
      // the client sent before it received the close frame
      client.readyState = 2; // CLOSING_STATE
      client.emit('message', frame({ event: 'push', data: 2 }));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1, 'push');
      expect(client.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('should remove the upgrade listener it added to a caller-supplied server', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);

      adapter.create(0, { path: '/live' });
      expect(httpServer.listenerCount('upgrade')).toBe(1);

      await adapter.dispose();

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });

    it('should not accumulate upgrade listeners across adapters sharing a server', async () => {
      const httpServer = createServer();

      for (let i = 0; i < 3; i++) {
        const adapter = new WsAdapter(httpServer);
        adapter.create(0, { path: '/live' });
        await adapter.dispose();
      }

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });
  });

  describe('upgrade listener', () => {
    it('should close the socket of an upgrade request whose URL cannot be parsed', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);
      adapter.create(0, { path: '/live' });
      const upgraded = new Promise<Duplex>(resolve =>
        httpServer.once('upgrade', (_, socket) => resolve(socket)),
      );
      await new Promise<void>(resolve =>
        httpServer.listen(0, '127.0.0.1', resolve),
      );
      const { port } = httpServer.address() as AddressInfo;

      // half-open, so that closing the connection is left to the server
      const client = connect({ port, host: '127.0.0.1', allowHalfOpen: true });
      try {
        client.write(
          'GET /live HTTP/1.1\r\nHost: a b\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
        );
        const [reply] = await once(client, 'data');
        const socket = await upgraded;

        expect(reply.toString()).toMatch(/^HTTP\/1\.1 400\r\n/);
        // what a client resetting the connection would raise
        expect(() =>
          socket.emit('error', new Error('read ECONNRESET')),
        ).not.toThrow();
        if (!socket.destroyed) {
          await once(socket, 'close');
        }
      } finally {
        client.destroy();
        await adapter.dispose();
        await new Promise(resolve => httpServer.close(resolve));
      }
    });
  });

  describe('create (own port and path)', () => {
    const getFreePort = async () => {
      const probe = createServer();
      await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
      const { port } = probe.address() as AddressInfo;
      await new Promise(resolve => probe.close(resolve));
      return port;
    };
    let adapter: WsAdapter;
    let port: number;

    beforeEach(async () => {
      adapter = new WsAdapter();
      port = await getFreePort();
    });
    afterEach(() => adapter.dispose());

    it('should answer a request that is not an upgrade with 426', async () => {
      adapter.create(port, { path: '/chat' });
      const httpServer = adapter['httpServersRegistry'].get(port);
      if (!httpServer.listening) {
        await once(httpServer, 'listening');
      }

      const response = await fetch(`http://127.0.0.1:${port}/chat`, {
        signal: AbortSignal.timeout(1000),
      });

      expect(response.status).toBe(426);
      expect(await response.text()).toBe('Upgrade Required');
    });

    it('should listen on the host from the options', async () => {
      adapter.create(port, { path: '/chat', host: '127.0.0.1' });
      const httpServer = adapter['httpServersRegistry'].get(port);
      if (!httpServer.listening) {
        await once(httpServer, 'listening');
      }

      expect(httpServer.address()).toMatchObject({
        address: '127.0.0.1',
        port,
      });
    });
  });
});
