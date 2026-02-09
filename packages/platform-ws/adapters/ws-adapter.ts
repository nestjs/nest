import { type INestApplicationContext, Logger } from '@nestjs/common';
import { AbstractWsAdapter } from '@nestjs/websockets';
import * as http from 'http';
import type { Duplex } from 'stream';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { catchError, filter, first, share, takeUntil } from 'rxjs/operators';
import { WebSocketServer } from 'ws';
import { isNil, normalizePath } from '@nestjs/common/internal';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/internal';
import type { MessageMappingProperties } from '@nestjs/websockets';
import { pathToRegexp } from 'path-to-regexp';
import { mergeMapBounded } from '../utils/merge-map-bounded.util.js';

type PathKey = { name: string };

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

type HttpServerRegistryKey = number;
type HttpServerRegistryEntry = any;
type WsServerRegistryKey = number;
type WsServerRegistryEntry = any[];
type UpgradeListener = (
  request: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
) => void;
type WsData = string | Buffer | ArrayBuffer | Buffer[];
type WsMessageParser = (data: WsData) => { event: string; data: any } | void;
type WsAdapterOptions = {
  messageParser?: WsMessageParser;
  /**
   * How many messages a client may have handled at the same time. Later ones
   * wait for their turn. Set it to `Infinity` to lift the limit.
   *
   * @default 1000
   */
  maxConcurrentMessages?: number;
  /**
   * How many bytes may be queued for a client that does not read what it is
   * sent before it is disconnected. Set it to `0` to lift the limit.
   *
   * @default 134217728 (128 MB)
   */
  maxSendBufferSize?: number;
};

/**
 * Extended WebSocket server type with dynamic path matching support
 */
interface WsServerWithPath {
  path: string;
  pathRegexp?: RegExp;
  pathKeys?: PathKey[];
  isStaticPath?: boolean;
  handleUpgrade: (
    request: any,
    socket: any,
    head: any,
    callback: (ws: unknown) => void,
  ) => void;
  emit: (event: string, ...args: any[]) => void;
}

/**
 * Path matching result containing matched servers and extracted parameters
 */
interface PathMatchResult {
  server: WsServerWithPath;
  params: Record<string, string>;
}

/**
 * Optimized path matcher for efficient WebSocket route resolution
 */
interface PathMatcher {
  staticPaths: Map<string, WsServerWithPath[]>;
  dynamicPaths: Array<{
    server: WsServerWithPath;
    pathRegexp: RegExp;
    pathKeys: PathKey[];
  }>;
}

const UNDERLYING_HTTP_SERVER_PORT = 0;
// How many messages of a client are handled at the same time. Kept here, like
// mergeMapBounded(), so that this package still loads with an older
// `@nestjs/websockets`.
const DEFAULT_MAX_CONCURRENT_MESSAGES = 1000;
// Reading from a client stops while more than this is queued for it
const SEND_BUFFER_HIGH_WATER_MARK = 1024 * 1024;
const DEFAULT_MAX_SEND_BUFFER_SIZE = 128 * 1024 * 1024;

// Kept out of the class so that an adapter can be compared against it to tell
// whether the parser in use is still the built-in one.
const defaultMessageParser: WsMessageParser = (data: WsData) => {
  return JSON.parse(data.toString());
};

// What ws answers on the servers it creates itself. A request left without an
// answer keeps its connection open, and Node goes on queueing the requests
// pipelined behind it until the heap runs out.
const rejectNonUpgradeRequest: http.RequestListener = (_, res) => {
  const body = http.STATUS_CODES[426]!;
  res.writeHead(426, {
    'Content-Length': body.length,
    'Content-Type': 'text/plain',
  });
  res.end(body);
};

/**
 * @publicApi
 */
export class WsAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(WsAdapter.name);
  protected readonly httpServersRegistry = new Map<
    HttpServerRegistryKey,
    HttpServerRegistryEntry
  >();
  protected readonly wsServersRegistry = new Map<
    WsServerRegistryKey,
    WsServerRegistryEntry
  >();
  private readonly upgradeListenersRegistry = new Map<
    HttpServerRegistryKey,
    UpgradeListener
  >();
  protected readonly pathMatchersCache = new Map<
    WsServerRegistryKey,
    PathMatcher
  >();
  protected messageParser: WsMessageParser = defaultMessageParser;
  protected readonly maxConcurrentMessages: number;
  protected readonly maxSendBufferSize: number;

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);

    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
    this.maxConcurrentMessages =
      options?.maxConcurrentMessages ?? DEFAULT_MAX_CONCURRENT_MESSAGES;
    this.maxSendBufferSize =
      options?.maxSendBufferSize ?? DEFAULT_MAX_SEND_BUFFER_SIZE;
  }

  public create(
    port: number,
    options?: Record<string, any> & {
      namespace?: string;
      server?: any;
      path?: string;
    },
  ) {
    const { server, path, ...wsOptions } = (options ?? {}) as {
      namespace?: string;
      server?: any;
      path?: string;
      host?: string;
      backlog?: number;
    };
    if (wsOptions?.namespace) {
      const error = new Error(
        '"WsAdapter" does not support namespaces. If you need namespaces in your project, consider using the "@nestjs/platform-socket.io" package instead.',
      );
      this.logger.error(error);
      throw error;
    }

    if (port === UNDERLYING_HTTP_SERVER_PORT && this.httpServer) {
      this.ensureHttpServerExists(port, this.httpServer);
      const wsServer = this.bindErrorHandler(
        new WebSocketServer({
          noServer: true,
          ...wsOptions,
        }),
      );

      this.addWsServerToRegistry(wsServer, port, path!);
      return wsServer;
    }

    if (server) {
      return server;
    }
    if (path && port !== UNDERLYING_HTTP_SERVER_PORT) {
      // Multiple servers with different paths
      // sharing a single HTTP/S server running on different port
      // than a regular HTTP application
      const httpServer = this.ensureHttpServerExists(port);
      // ws listens with "host" and "backlog" only on a server it creates
      // itself, and the one below has none (noServer)
      httpServer?.listen(port, wsOptions.host, wsOptions.backlog);

      const wsServer = this.bindErrorHandler(
        new WebSocketServer({
          noServer: true,
          ...wsOptions,
        }),
      );
      this.addWsServerToRegistry(wsServer, port, path);
      return wsServer;
    }
    const wsServer = this.bindErrorHandler(
      new WebSocketServer({
        port,
        path,
        ...wsOptions,
      }),
    );
    return wsServer;
  }

  public bindMessageHandlers(
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach(handler => handlersMap.set(handler.message, handler));

    // ws reads everything a client sends, whether or not its messages can be
    // handled yet and whether or not it reads the replies. Reading stops while
    // messages wait for their turn, or while replies the client has not read
    // pile up, and resumes once it has caught up.
    let isBacklogged = false;
    let pendingReplies = 0;
    let isPaused = false;
    const updatePaused = () => {
      const shouldPause =
        isBacklogged ||
        (pendingReplies > 0 &&
          client.bufferedAmount > SEND_BUFFER_HIGH_WATER_MARK);
      if (shouldPause === isPaused) {
        return;
      }
      isPaused = shouldPause;
      if (isPaused) {
        client.pause?.();
      } else {
        client.resume?.();
      }
    };

    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      // ws still emits what a client sent before it got the close frame, e.g.
      // after handleConnection() called client.close(). Like socket.io does
      // for a disconnected socket, drop those instead of handling them.
      filter(() => client.readyState === READY_STATE.OPEN_STATE),
      filter(() => this.ensureSendBufferWithinLimit(client)),
      // How many messages are pending at once is up to the client: ws emits
      // all the messages of a read before any handler can settle.
      mergeMapBounded(
        data =>
          this.bindMessageHandler(data, handlersMap, transform).pipe(
            filter(result => !isNil(result)),
            // a handler that rejects through an error filter that rethrows
            // would error the client's stream and silence every later message;
            // that rethrow is an app bug, so it gets logged, not dropped silently
            catchError(err => {
              this.logger.error(err);
              return EMPTY;
            }),
          ),
        this.maxConcurrentMessages,
        backlogged => {
          isBacklogged = backlogged;
          updatePaused();
        },
      ),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      // JSON.stringify throws on circular structures and BigInts, and on
      // client-controlled payloads nested deep enough to overflow its native
      // recursion (JSON.parse accepts any depth). A throw here escapes the
      // subscriber, which RxJS rethrows asynchronously, killing the process.
      let payload: string;
      try {
        payload = JSON.stringify(response);
      } catch (err) {
        this.logger.error(err);
        return;
      }
      pendingReplies++;
      client.send(payload, () => {
        pendingReplies--;
        updatePaused();
      });
      if (this.ensureSendBufferWithinLimit(client)) {
        updatePaused();
      }
    };
    source$.subscribe(onMessage);
  }

  public bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    let message: ReturnType<WsMessageParser>;
    try {
      message = this.messageParser(buffer.data);
    } catch (err) {
      // A custom parser that throws is an application bug, and swallowing it
      // leaves no trace of it anywhere. The default parser, on the other hand,
      // throws on client-controlled input, so reporting that one would turn a
      // public socket into a log flood target. A custom parser that wants a
      // frame dropped silently can return nothing, which is handled below.
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
      // An unrecognised event is an expected condition on a public socket,
      // not an error. It used to reach the catch below as a TypeError.
      return EMPTY;
    }

    try {
      return transform(messageHandler.callback(message.data, message.event));
    } catch {
      // Kept deliberately: a synchronous throw here would otherwise propagate
      // through the mergeMap in bindMessageHandlers and tear down the client's
      // source stream, silencing every subsequent message from that client.
      return EMPTY;
    }
  }

  /**
   * Not reading from a client keeps it from asking for more, but what is
   * already on its way to it still queues up: the replies to the messages
   * being handled, values of Observables returned by handlers, and what
   * exception filters send. This caps how much may be held for one client,
   * like "maxSendBufferSize" of the TCP transport. Returns `false` once the
   * client has been closed for exceeding it.
   */
  protected ensureSendBufferWithinLimit(client: any): boolean {
    const bufferedAmount = client.bufferedAmount;
    if (!this.maxSendBufferSize || !(bufferedAmount > this.maxSendBufferSize)) {
      return true;
    }
    // The queue is dropped only once the socket has closed, so a client that
    // is already closing is not closed and reported again
    if (client.readyState === READY_STATE.OPEN_STATE) {
      this.logger.warn(
        `Closing a client with ${bufferedAmount} bytes queued for it, more than "maxSendBufferSize" (${this.maxSendBufferSize})`,
      );
      client.terminate();
    }
    return false;
  }

  public bindErrorHandler(server: any) {
    server.on(CONNECTION_EVENT, (ws: any) =>
      ws.on(ERROR_EVENT, (err: any) => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, (err: any) => this.logger.error(err));
    return server;
  }

  public bindClientDisconnect(client: any, callback: Function) {
    if (typeof client.once === 'function') {
      client.once(CLOSE_EVENT, callback);
      return;
    }
    client.on(CLOSE_EVENT, callback);
  }

  public async close(server: any) {
    const closeEventSignal = new Promise((resolve, reject) =>
      server.close((err: Error) => (err ? reject(err) : resolve(undefined))),
    );
    if (server.clients) {
      for (const ws of server.clients) {
        ws.terminate();
      }
    }
    await closeEventSignal;
  }

  public async dispose() {
    const closeEventSignals = Array.from(this.httpServersRegistry)
      .filter(([port]) => port !== UNDERLYING_HTTP_SERVER_PORT)
      .map(([_, server]) => new Promise(resolve => server.close(resolve)));

    // A server passed in by the caller outlives this adapter, so the listener
    // added to it has to be taken off explicitly. Servers created here are
    // closed above and take their listeners with them.
    this.upgradeListenersRegistry.forEach((listener, port) =>
      this.httpServersRegistry.get(port)?.off('upgrade', listener),
    );

    await Promise.all(closeEventSignals);
    this.httpServersRegistry.clear();
    this.wsServersRegistry.clear();
    this.upgradeListenersRegistry.clear();
    this.pathMatchersCache.clear();
  }

  public setMessageParser(parser: WsMessageParser) {
    this.messageParser = parser;
  }

  protected ensureHttpServerExists(
    port: number,
    httpServer = http.createServer(rejectNonUpgradeRequest),
  ) {
    if (this.httpServersRegistry.has(port)) {
      return;
    }
    this.httpServersRegistry.set(port, httpServer);

    const upgradeListener: UpgradeListener = (request, socket, head) => {
      try {
        const baseUrl = 'ws://' + request.headers.host + '/';
        const pathname = new URL(request.url!, baseUrl).pathname;
        const pathMatcher = this.getOrCreatePathMatcher(port);
        const matchResult = this.matchPath(pathname, pathMatcher);

        let isRequestDelegated = false;
        if (matchResult) {
          const { server, params } = matchResult;

          // Inject path parameters if any
          if (Object.keys(params).length > 0) {
            (request as any).params = params;

            this.logger.debug(
              `WebSocket connection matched dynamic path "${server.path}" with params:`,
              params,
            );
          }

          server.handleUpgrade(request, socket, head, (ws: unknown) => {
            if (Object.keys(params).length > 0) {
              (ws as any)._pathParams = params;
              (ws as any).upgradeReq = request;
            }

            server.emit('connection', ws, request);
          });
          isRequestDelegated = true;
        }
        if (!isRequestDelegated) {
          socket.destroy();
        }
      } catch (err) {
        // Node hands the socket over without listeners of its own, and end()
        // only half-closes it. A client resetting the connection afterwards
        // would raise an unhandled 'error' event, and one that never closes
        // would keep the socket open. ws's own abortHandshake() does the same.
        socket.on(ERROR_EVENT, () => socket.destroy());
        socket.once('finish', () => socket.destroy());
        socket.end(`HTTP/1.1 400\r\n${err.message}`);
      }
    };
    httpServer.on('upgrade', upgradeListener);
    this.upgradeListenersRegistry.set(port, upgradeListener);
    return httpServer;
  }

  /**
   * Get or create an optimized path matcher for the specified port
   */
  protected getOrCreatePathMatcher(port: number): PathMatcher {
    let pathMatcher = this.pathMatchersCache.get(port);
    if (!pathMatcher) {
      const wsServersCollection = this.wsServersRegistry.get(port) || [];
      pathMatcher = this.createPathMatcher(
        wsServersCollection as WsServerWithPath[],
      );
      this.pathMatchersCache.set(port, pathMatcher);
    }
    return pathMatcher;
  }

  /**
   * Create an optimized path matcher from WebSocket servers
   */
  protected createPathMatcher(servers: WsServerWithPath[]): PathMatcher {
    const matcher: PathMatcher = {
      staticPaths: new Map(),
      dynamicPaths: [],
    };

    let staticCount = 0;
    let dynamicCount = 0;

    for (const server of servers) {
      if (server.isStaticPath !== false) {
        // Static path - use Map for O(1) lookup
        const existing = matcher.staticPaths.get(server.path) || [];
        existing.push(server);
        matcher.staticPaths.set(server.path, existing);
        staticCount++;
      } else {
        // Dynamic path - store for sequential matching
        matcher.dynamicPaths.push({
          server,
          pathRegexp: server.pathRegexp!,
          pathKeys: server.pathKeys || [],
        });
        dynamicCount++;
      }
    }

    // Sort dynamic paths by complexity (simpler patterns first for better performance)
    matcher.dynamicPaths.sort((a, b) => {
      const aComplexity =
        (a.pathKeys?.length || 0) + (a.server.path.split('/').length || 0);
      const bComplexity =
        (b.pathKeys?.length || 0) + (b.server.path.split('/').length || 0);
      return aComplexity - bComplexity;
    });

    this.logger.log(
      `Created optimized path matcher: ${staticCount} static paths, ${dynamicCount} dynamic paths`,
    );

    return matcher;
  }

  /**
   * Match a pathname against the optimized path matcher
   * Returns the first matching server and extracted parameters
   */
  protected matchPath(
    pathname: string,
    matcher: PathMatcher,
  ): PathMatchResult | null {
    // First try static paths (O(1) lookup)
    const staticServers = matcher.staticPaths.get(pathname);
    if (staticServers && staticServers.length > 0) {
      return {
        server: staticServers[0], // Return first matching static server
        params: {},
      };
    }

    // Then try dynamic paths (ordered by complexity)
    for (const { server, pathRegexp, pathKeys } of matcher.dynamicPaths) {
      const match = pathRegexp.exec(pathname);
      if (match) {
        const params: Record<string, string> = {};

        // Extract path parameters
        pathKeys.forEach((key, index) => {
          const paramValue = match[index + 1];
          if (paramValue !== undefined) {
            try {
              params[key.name] = decodeURIComponent(paramValue);
            } catch (error) {
              // Fallback to raw value if decoding fails
              params[key.name] = paramValue;
              this.logger.warn(
                `Failed to decode path parameter "${key.name}": ${paramValue}`,
              );
            }
          }
        });

        return {
          server,
          params,
        };
      }
    }

    return null;
  }

  protected addWsServerToRegistry<T extends Record<'path', string> = any>(
    wsServer: T,
    port: number,
    path: string,
  ) {
    const entries = this.wsServersRegistry.get(port) ?? [];
    const normalizedPath = normalizePath(path);

    // Prepare path matching
    const wsServerWithPath = wsServer as unknown as WsServerWithPath;
    wsServerWithPath.path = normalizedPath;

    const isDynamicPath =
      normalizedPath.includes(':') ||
      normalizedPath.includes('*') ||
      normalizedPath.includes('(');

    if (isDynamicPath) {
      try {
        const pathRegexpResult = pathToRegexp(normalizedPath);
        wsServerWithPath.pathRegexp = pathRegexpResult.regexp;
        wsServerWithPath.pathKeys = pathRegexpResult.keys || [];
        wsServerWithPath.isStaticPath = false;

        this.logger.log(
          `Registered WebSocket server with dynamic path: ${normalizedPath} on port ${port}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to compile dynamic path "${normalizedPath}": ${error.message}`,
          error.stack,
        );
        wsServerWithPath.isStaticPath = true;
      }
    } else {
      wsServerWithPath.isStaticPath = true;
    }

    entries.push(wsServerWithPath);
    this.wsServersRegistry.set(port, entries);

    // Invalidate path matcher cache for this port
    this.pathMatchersCache.delete(port);
  }
}
