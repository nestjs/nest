import { EventEmitter } from 'events';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import {
  config,
  from,
  lastValueFrom,
  mergeAll,
  of,
  toArray,
  type Observable,
} from 'rxjs';
import WebSocket from 'ws';
import { WS_PATH_PARAMS } from '../../websockets/constants.js';
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

  describe('path matching', () => {
    let adapter: WsAdapter;
    let httpServer: ReturnType<typeof createServer>;
    let port: number;
    const sockets: WebSocket[] = [];

    beforeEach(async () => {
      httpServer = createServer();
      adapter = new WsAdapter(httpServer);
      vi.spyOn(adapter['logger'], 'error').mockImplementation(() => undefined);
      await new Promise<void>(resolve => httpServer.listen(0, () => resolve()));
      port = (httpServer.address() as AddressInfo).port;
    });

    afterEach(async () => {
      for (const socket of sockets.splice(0)) {
        socket.terminate();
      }
      await adapter.dispose();
      await new Promise<void>((resolve, reject) =>
        httpServer.close(err => (err ? reject(err) : resolve())),
      );
    });

    function connect(pathname: string) {
      return new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`);
        sockets.push(ws);
        ws.once('open', () => resolve(ws));
        ws.once('error', reject);
      });
    }

    function expectReject(pathname: string) {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`);
        sockets.push(ws);
        ws.once('open', () =>
          reject(new Error(`Should not connect to ${pathname}`)),
        );
        ws.once('error', () => resolve());
        ws.once('unexpected-response', () => resolve());
        ws.once('close', () => resolve());
      });
    }

    it('should throw when compiling an invalid path-to-regexp v8 pattern', () => {
      expect(() => adapter.create(0, { path: '/legacy/*' })).toThrow(
        /named wildcards/,
      );
    });

    it('should route overlapping dynamic paths by registration order', async () => {
      const specific = adapter.create(0, { path: '/files/:id/meta' });
      adapter.create(0, { path: '/files/*path' });

      const winner = new Promise<string>(resolve => {
        specific.once('connection', (client: any) => {
          expect(client[WS_PATH_PARAMS]).toEqual({ id: '1' });
          expect(client.upgradeReq).toBeUndefined();
          resolve('specific');
        });
      });

      await connect('/files/1/meta');
      await expect(winner).resolves.toBe('specific');
    });

    it('should expose handshake params on the request and WS_PATH_PARAMS', async () => {
      const server = adapter.create(0, { path: '/chat/:roomId/socket' });
      const seen = new Promise<{ params: unknown; requestParams: unknown }>(
        resolve => {
          server.once('connection', (client: any, req: any) => {
            resolve({
              params: client[WS_PATH_PARAMS],
              requestParams: req.params,
            });
          });
        },
      );

      await connect('/chat/room-1/socket');
      await expect(seen).resolves.toEqual({
        params: { roomId: 'room-1' },
        requestParams: { roomId: 'room-1' },
      });
    });

    it('should return wildcard captures as arrays, matching HTTP @Param()', async () => {
      const server = adapter.create(0, { path: '/files/*path' });
      const seen = new Promise<unknown>(resolve => {
        server.once('connection', (client: any) => {
          resolve(client[WS_PATH_PARAMS]);
        });
      });

      await connect('/files/a/b/c');
      await expect(seen).resolves.toEqual({ path: ['a', 'b', 'c'] });
    });

    it('should match optional brace groups', async () => {
      const server = adapter.create(0, { path: '/chat{/lobby}' });
      const connections: string[] = [];
      server.on('connection', (_client: unknown, req: { url?: string }) => {
        connections.push(req.url!);
      });

      await connect('/chat');
      await connect('/chat/lobby');
      expect(connections).toEqual(['/chat', '/chat/lobby']);
    });

    it('should not match a trailing slash or a different case', async () => {
      adapter.create(0, { path: '/chat/:roomId/socket' });

      await expectReject('/chat/room-1/socket/');
      await expectReject('/CHAT/room-1/socket');
    });

    it('should reject malformed percent-encoding with a 400', async () => {
      adapter.create(0, { path: '/chat/:roomId/socket' });
      await expectReject('/chat/%E0%A4%A/socket');
    });

    it('should match a dynamic path on a separate HTTP port', async () => {
      const extraPort = await new Promise<number>((resolve, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, () => {
          const { port } = probe.address() as AddressInfo;
          probe.close(err => (err ? reject(err) : resolve(port)));
        });
      });

      const server = adapter.create(extraPort, { path: '/dyn/:id' });
      const extraHttp = adapter['httpServersRegistry'].get(extraPort);
      if (extraHttp && !extraHttp.listening) {
        await new Promise<void>((resolve, reject) => {
          extraHttp.once('listening', () => resolve());
          extraHttp.once('error', reject);
        });
      }

      const seen = new Promise<unknown>(resolve => {
        server.once('connection', (client: any) => {
          resolve(client[WS_PATH_PARAMS]);
        });
      });

      const ws = new WebSocket(`ws://127.0.0.1:${extraPort}/dyn/xyz`);
      sockets.push(ws);
      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      await expect(seen).resolves.toEqual({ id: 'xyz' });
    });
  });
});
