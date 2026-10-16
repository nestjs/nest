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
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { catchError, filter, first, share, takeUntil } from 'rxjs/operators';
import { mergeMapBounded } from '../utils/merge-map-bounded.util';

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
  /**
   * How many messages a client may have handled at the same time. Later ones
   * wait for their turn. Set it to `Infinity` to lift the limit.
   *
   * @default 1000
   */
  maxConcurrentMessages?: number;
};

const UNDERLYING_HTTP_SERVER_PORT = 0;
// How many messages of a client are handled at the same time
const DEFAULT_MAX_CONCURRENT_MESSAGES = 1000;

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
  protected messageParser: WsMessageParser = (data: WsData) => {
    return JSON.parse(data.toString());
  };
  protected readonly maxConcurrentMessages: number;

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);
    wsPackage = loadPackage('ws', 'WsAdapter', () => require('ws'));

    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
    this.maxConcurrentMessages =
      options?.maxConcurrentMessages ?? DEFAULT_MAX_CONCURRENT_MESSAGES;
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
      // ws listens with "host" and "backlog" only on a server it creates
      // itself, and the one below has none (noServer)
      httpServer?.listen(port, wsOptions.host, wsOptions.backlog);

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
      // ws still emits what a client sent before it got the close frame, e.g.
      // after handleConnection() called client.close(). Like socket.io does
      // for a disconnected socket, drop those instead of handling them.
      filter(() => client.readyState === READY_STATE.OPEN_STATE),
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
      client.send(payload);
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
    httpServer = http.createServer(rejectNonUpgradeRequest),
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
          if (pathname === wsServer.path) {
            wsServer.handleUpgrade(request, socket, head, (ws: unknown) => {
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
        // Node hands the socket over without listeners of its own, and end()
        // only half-closes it. A client resetting the connection afterwards
        // would raise an unhandled 'error' event, and one that never closes
        // would keep the socket open. ws's own abortHandshake() does the same.
        socket.on(ERROR_EVENT, () => socket.destroy());
        socket.once('finish', () => socket.destroy());
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
    entries.push(wsServer);

    wsServer.path = normalizePath(path);
    this.wsServersRegistry.set(port, entries);
  }
}
