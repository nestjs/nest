import { INestApplicationContext, Logger } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isNil, normalizePath } from '@nestjs/common/utils/shared.utils';
import { AbstractWsAdapter } from '@nestjs/websockets';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/constants';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import * as http from 'http';
import { pathToRegexp, Key } from 'path-to-regexp';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';

let wsPackage: any = {};

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
type WsData = string | Buffer | ArrayBuffer | Buffer[];
type WsMessageParser = (data: WsData) => { event: string; data: any } | void;
type WsAdapterOptions = {
  messageParser?: WsMessageParser;
};

/**
 * Extended WebSocket server type with dynamic path matching support
 */
interface WsServerWithPath {
  path: string;
  pathRegexp?: RegExp;
  pathKeys?: Key[];
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
    pathKeys: Key[];
  }>;
}

const UNDERLYING_HTTP_SERVER_PORT = 0;

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
  protected readonly pathMatchersCache = new Map<
    WsServerRegistryKey,
    PathMatcher
  >();
  protected messageParser: WsMessageParser = (data: WsData) => {
    return JSON.parse(data.toString());
  };

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);
    wsPackage = loadPackage('ws', 'WsAdapter', () => require('ws'));

    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
  }

  public create(
    port: number,
    options?: Record<string, any> & {
      namespace?: string;
      server?: any;
      path?: string;
    },
  ) {
    const { server, path, ...wsOptions } = options as {
      namespace?: string;
      server?: any;
      path?: string;
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
        new wsPackage.Server({
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
      httpServer?.listen(port);

      const wsServer = this.bindErrorHandler(
        new wsPackage.Server({
          noServer: true,
          ...wsOptions,
        }),
      );
      this.addWsServerToRegistry(wsServer, port, path);
      return wsServer;
    }
    const wsServer = this.bindErrorHandler(
      new wsPackage.Server({
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

    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap(data =>
        this.bindMessageHandler(data, handlersMap, transform).pipe(
          filter(result => !isNil(result)),
        ),
      ),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.send(JSON.stringify(response));
    };
    source$.subscribe(onMessage);
  }

  public bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    try {
      const message = this.messageParser(buffer.data);
      if (!message) {
        return EMPTY;
      }
      const messageHandler = handlersMap.get(message.event)!;
      const { callback } = messageHandler;
      return transform(callback(message.data, message.event));
    } catch {
      return EMPTY;
    }
  }

  public bindErrorHandler(server: any) {
    server.on(CONNECTION_EVENT, (ws: any) =>
      ws.on(ERROR_EVENT, (err: any) => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, (err: any) => this.logger.error(err));
    return server;
  }

  public bindClientDisconnect(client: any, callback: Function) {
    client.on(CLOSE_EVENT, callback);
  }

  public async close(server: any) {
    const closeEventSignal = new Promise((resolve, reject) =>
      server.close((err: Error) => (err ? reject(err) : resolve(undefined))),
    );
    for (const ws of server.clients) {
      ws.terminate();
    }
    await closeEventSignal;
  }

  public async dispose() {
    const closeEventSignals = Array.from(this.httpServersRegistry)
      .filter(([port]) => port !== UNDERLYING_HTTP_SERVER_PORT)
      .map(([_, server]) => new Promise(resolve => server.close(resolve)));

    await Promise.all(closeEventSignals);
    this.httpServersRegistry.clear();
    this.wsServersRegistry.clear();
    // Clear path matcher cache to prevent memory leaks
    this.pathMatchersCache.clear();
  }

  public setMessageParser(parser: WsMessageParser) {
    this.messageParser = parser;
  }

  protected ensureHttpServerExists(
    port: number,
    httpServer = http.createServer(),
  ) {
    if (this.httpServersRegistry.has(port)) {
      return;
    }
    this.httpServersRegistry.set(port, httpServer);

    httpServer.on('upgrade', (request, socket, head) => {
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
        socket.end('HTTP/1.1 400\r\n' + err.message);
      }
    });
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
