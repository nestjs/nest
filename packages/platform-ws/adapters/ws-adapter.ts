import { type INestApplicationContext, Logger } from '@nestjs/common';
import { AbstractWsAdapter } from '@nestjs/websockets';
import * as http from 'http';
import { createRequire } from 'module';
import type { Duplex } from 'stream';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import {
  catchError,
  filter,
  first,
  mergeMap,
  share,
  takeUntil,
} from 'rxjs/operators';
import { loadPackageSync, isNil, normalizePath } from '@nestjs/common/internal';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/internal';
import type { MessageMappingProperties } from '@nestjs/websockets';
import { pathToRegexp, Key } from 'path-to-regexp';

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
type UpgradeListener = (
  request: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
) => void;
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

// Kept out of the class so that an adapter can be compared against it to tell
// whether the parser in use is still the built-in one.
const defaultMessageParser: WsMessageParser = (data: WsData) => {
  return JSON.parse(data.toString());
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
  protected messageParser: WsMessageParser = defaultMessageParser;

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);
    wsPackage = loadPackageSync('ws', 'WsAdapter', () =>
      createRequire(import.meta.url)('ws'),
    );
    // Normalize CJS/ESM: In CJS, require('ws') returns WebSocket with .Server.
    // We need .Server for creating WebSocketServer instances.
    if (!wsPackage.Server) {
      wsPackage = { ...wsPackage, Server: wsPackage.WebSocketServer };
    }

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
          // a handler that rejects through an error filter that rethrows
          // would error the client's stream and silence every later message;
          // that rethrow is an app bug, so it gets logged, not dropped silently
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
      client.send(JSON.stringify(response));
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

    const upgradeListener: UpgradeListener = (request, socket, head) => {
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
        socket.end(`HTTP/1.1 400\r\n${err.message}`);
      }
    };
    httpServer.on('upgrade', upgradeListener);
    this.upgradeListenersRegistry.set(port, upgradeListener);
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
