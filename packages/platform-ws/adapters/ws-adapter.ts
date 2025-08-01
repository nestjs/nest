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
        const wsServersCollection = this.wsServersRegistry.get(port)!;

        let isRequestDelegated = false;
        for (const wsServer of wsServersCollection) {
          const wsServerWithPath = wsServer as WsServerWithPath;
          let pathMatch = false;
          const pathParams: Record<string, string> = {};

          if (wsServerWithPath.isStaticPath !== false) {
            pathMatch = pathname === wsServerWithPath.path;
          } else {
            // Dynamic path matching using path-to-regexp
            const match = wsServerWithPath.pathRegexp!.exec(pathname);
            if (match) {
              pathMatch = true;

              if (
                wsServerWithPath.pathKeys &&
                wsServerWithPath.pathKeys.length > 0
              ) {
                wsServerWithPath.pathKeys.forEach((key, index) => {
                  const paramValue = match[index + 1];
                  if (paramValue !== undefined) {
                    pathParams[key.name] = decodeURIComponent(paramValue);
                  }
                });
              }
            }
          }

          if (pathMatch) {
            // Inject
            if (Object.keys(pathParams).length > 0) {
              (request as any).params = pathParams;

              this.logger.debug(
                `WebSocket connection matched dynamic path "${wsServerWithPath.path}" with params:`,
                pathParams,
              );
            }

            wsServer.handleUpgrade(request, socket, head, (ws: unknown) => {
              if (Object.keys(pathParams).length > 0) {
                (ws as any)._pathParams = pathParams;
                (ws as any).upgradeReq = request;
              }

              wsServer.emit('connection', ws, request);
            });
            isRequestDelegated = true;
            break;
          }
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
  }
}
