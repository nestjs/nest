import { type INestApplicationContext, Logger } from '@nestjs/common';
import { isNil, normalizePath } from '@nestjs/common/internal';
import type { MessageMappingProperties } from '@nestjs/websockets';
import { AbstractWsAdapter } from '@nestjs/websockets';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/internal';
import type { Server, ServerWebSocket, WebSocketHandler } from 'bun';
import { EventEmitter } from 'node:events';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import {
  catchError,
  filter,
  first,
  mergeMap,
  share,
  takeUntil,
} from 'rxjs/operators';

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

type BunWsData = string | Buffer;
type BunWsMessageParser = (
  data: BunWsData,
) => { event: string; data: any } | void;
type BunWsAdapterOptions = {
  messageParser?: BunWsMessageParser;
};
type BunWsServerOptions = Record<string, any> & {
  namespace?: string;
  path?: string;
};

/** The subset of `BunHttpServer` (`@nestjs/platform-bun`) this adapter needs. */
interface BunHttpServerLike {
  setWebSocketHandler(handler: {
    upgrade(request: Request, server: Server<any>): boolean;
    websocket: WebSocketHandler<any>;
  }): void;
}

interface SocketData {
  server: BunWsServer;
  request: Request;
  client?: BunWsClient;
}

const UNDERLYING_HTTP_SERVER_PORT = 0;

// Kept out of the class so that an adapter can be compared against it to tell
// whether the parser in use is still the built-in one.
const defaultMessageParser: BunWsMessageParser = (data: BunWsData) => {
  return JSON.parse(data.toString());
};

/**
 * Event-emitter facade over Bun's `ServerWebSocket`, shaped like a `ws`
 * client: emits `'message'` (`{ data }`), `'close'` and `'error'`, and
 * exposes `send()`, `close()`, `terminate()` and `readyState`. Bun's native
 * pub/sub is available through `subscribe()`/`publish()`.
 *
 * @publicApi
 */
export class BunWsClient extends EventEmitter {
  constructor(
    /** The underlying Bun socket. */
    public readonly raw: ServerWebSocket<SocketData>,
  ) {
    super();
  }

  /** The upgrade request the connection was opened with. */
  public get request(): Request {
    return this.raw.data.request;
  }

  public get readyState(): number {
    return this.raw.readyState;
  }

  public get remoteAddress(): string {
    return this.raw.remoteAddress;
  }

  public send(
    data: string | ArrayBufferView | ArrayBuffer,
    compress?: boolean,
  ) {
    return this.raw.send(data as any, compress);
  }

  public close(code?: number, reason?: string) {
    this.raw.close(code, reason);
  }

  public terminate() {
    this.raw.terminate();
  }

  public subscribe(topic: string) {
    this.raw.subscribe(topic);
  }

  public unsubscribe(topic: string) {
    this.raw.unsubscribe(topic);
  }

  public isSubscribed(topic: string): boolean {
    return this.raw.isSubscribed(topic);
  }

  /** Sends to every other subscriber of `topic`. */
  public publish(topic: string, data: string | ArrayBufferView | ArrayBuffer) {
    return this.raw.publish(topic, data as any);
  }
}

/**
 * A gateway server: the connections accepted on one path. Emits
 * `'connection'` (`client`, `request`) and `'error'`.
 *
 * @publicApi
 */
export class BunWsServer extends EventEmitter {
  public readonly clients = new Set<BunWsClient>();

  constructor(
    public readonly path: string,
    private readonly hub: BunWsHub,
  ) {
    super();
  }

  /** Sends `data` to every subscriber of `topic` on this port. */
  public publish(topic: string, data: string | ArrayBufferView | ArrayBuffer) {
    return this.hub.publish(topic, data);
  }

  public close(callback?: (err?: Error) => void) {
    for (const client of this.clients) {
      client.close(1001, 'Server closing');
    }
    this.clients.clear();
    this.hub.remove(this);
    this.emit('close');
    callback?.();
  }
}

/**
 * One `websocket` handler per Bun server: routes upgrades to the gateway
 * server registered for the request path.
 */
class BunWsHub {
  private readonly servers = new Map<string, BunWsServer>();
  private bunServer: Server<any> | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly onEmpty?: () => void,
  ) {}

  public readonly websocket: WebSocketHandler<SocketData> = {
    open: ws => {
      const client = new BunWsClient(ws);
      ws.data.client = client;
      ws.data.server.clients.add(client);
      ws.data.server.emit(CONNECTION_EVENT, client, ws.data.request);
    },
    message: (ws, message) => {
      ws.data.client?.emit('message', { data: message });
    },
    close: (ws, code, reason) => {
      const client = ws.data.client;
      if (!client) {
        return;
      }
      ws.data.server.clients.delete(client);
      client.emit(CLOSE_EVENT, code, reason);
    },
  };

  public add(server: BunWsServer) {
    if (this.servers.has(server.path)) {
      throw new Error(
        `A WebSocket gateway is already registered on path "${server.path}".`,
      );
    }
    this.servers.set(server.path, server);
  }

  public remove(server: BunWsServer) {
    if (this.servers.get(server.path) === server) {
      this.servers.delete(server.path);
    }
    if (this.servers.size === 0) {
      this.onEmpty?.();
    }
  }

  public upgrade = (request: Request, server: Server<any>): boolean => {
    this.bunServer = server;
    const pathname = new URL(request.url).pathname;
    const target = this.servers.get(normalizePath(pathname));
    if (!target) {
      return false;
    }
    try {
      return (server as Server<SocketData>).upgrade(request, {
        data: { server: target, request },
      });
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  };

  public publish(topic: string, data: string | ArrayBufferView | ArrayBuffer) {
    return this.bunServer?.publish(topic, data as any) ?? 0;
  }
}

/**
 * WebSocket adapter built on Bun's native `Bun.serve({ websocket })`.
 * Gateways without a port share the HTTP port of a `BunAdapter` application;
 * gateways with a port get their own `Bun.serve()` instance.
 *
 * @example
 * const app = await NestFactory.create(AppModule, new BunAdapter());
 * app.useWebSocketAdapter(new BunWsAdapter(app));
 *
 * @publicApi
 */
export class BunWsAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(BunWsAdapter.name);
  protected readonly hubs = new Map<number, BunWsHub>();
  protected readonly standaloneServers = new Map<number, Server<any>>();
  protected messageParser: BunWsMessageParser = defaultMessageParser;

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: BunWsAdapterOptions,
  ) {
    super(appOrHttpServer);
    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
  }

  public create(port: number, options?: BunWsServerOptions): BunWsServer {
    const { path, namespace } = options ?? {};
    if (namespace) {
      const error = new Error(
        '"BunWsAdapter" does not support namespaces. If you need namespaces in your project, consider using the "@nestjs/platform-socket.io" package instead.',
      );
      this.logger.error(error);
      throw error;
    }
    const hub = this.ensureHub(port);
    const server = this.bindErrorHandler(
      new BunWsServer(normalizePath(path ?? '/'), hub),
    );
    hub.add(server);
    return server;
  }

  public bindMessageHandlers(
    client: BunWsClient,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach(handler => handlersMap.set(handler.message, handler));

    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap(data =>
        this.bindMessageHandler(data, handlersMap, transform).pipe(
          filter(result => !isNil(result)),
          // a rethrowing error filter would otherwise error the client's
          // stream and silence every later message
          catchError(err => {
            this.logger.error(err);
            return EMPTY;
          }),
        ),
      ),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      // JSON.stringify throws on circular structures, BigInts and payloads
      // nested deep enough to overflow its recursion; a throw here would
      // escape the subscriber and kill the process.
      let payload: string;
      try {
        payload = JSON.stringify(response);
      } catch (err) {
        this.logger.error(err);
        return;
      }
      client.send(payload);
    };
    source$.subscribe(onMessage);
  }

  public bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    let message: ReturnType<BunWsMessageParser>;
    try {
      message = this.messageParser(buffer.data);
    } catch (err) {
      // The default parser throws on client-controlled input, so only a
      // custom parser's failure is reported (see WsAdapter).
      if (this.messageParser !== defaultMessageParser) {
        this.logger.error(err);
      }
      return EMPTY;
    }
    if (!message) {
      return EMPTY;
    }
    const messageHandler = handlersMap.get(message.event);
    if (!messageHandler) {
      return EMPTY;
    }
    try {
      return transform(messageHandler.callback(message.data, message.event));
    } catch {
      return EMPTY;
    }
  }

  public bindErrorHandler(server: BunWsServer) {
    server.on(CONNECTION_EVENT, (client: BunWsClient) =>
      client.on(ERROR_EVENT, (err: any) => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, (err: any) => this.logger.error(err));
    return server;
  }

  public bindClientDisconnect(client: BunWsClient, callback: Function) {
    client.once(CLOSE_EVENT, callback as (...args: any[]) => void);
  }

  public async close(server: BunWsServer) {
    await new Promise(resolve => server.close(resolve));
  }

  public async dispose() {
    await Promise.all(
      Array.from(this.standaloneServers.values()).map(server =>
        server.stop(true),
      ),
    );
    this.standaloneServers.clear();
    this.hubs.clear();
  }

  public setMessageParser(parser: BunWsMessageParser) {
    this.messageParser = parser;
  }

  protected ensureHub(port: number): BunWsHub {
    const existing = this.hubs.get(port);
    if (existing) {
      return existing;
    }
    let hub: BunWsHub;
    if (port === UNDERLYING_HTTP_SERVER_PORT) {
      const httpServer = this.httpServer as BunHttpServerLike | undefined;
      if (typeof httpServer?.setWebSocketHandler !== 'function') {
        throw new Error(
          '"BunWsAdapter" can only share the HTTP port of a "BunAdapter" application ' +
            '(@nestjs/platform-bun). Pass the application to the adapter, or give the gateway a port.',
        );
      }
      hub = new BunWsHub(this.logger);
      httpServer.setWebSocketHandler(hub);
    } else {
      hub = new BunWsHub(this.logger, () => {
        void this.standaloneServers.get(port)?.stop(true);
        this.standaloneServers.delete(port);
        this.hubs.delete(port);
      });
      this.standaloneServers.set(
        port,
        Bun.serve({
          port,
          websocket: hub.websocket,
          fetch: (request, server) =>
            hub.upgrade(request, server)
              ? undefined
              : new Response('Upgrade Required', { status: 426 }),
        }),
      );
    }
    this.hubs.set(port, hub);
    return hub;
  }
}
