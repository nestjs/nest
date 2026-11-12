import { INestApplicationContext, Logger } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  isFunction,
  isNil,
  normalizePath,
} from '@nestjs/common/utils/shared.utils';
import { AbstractWsAdapter } from '@nestjs/websockets';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/constants';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import * as http from 'http';
import type { Socket } from 'net';
import type { Duplex } from 'stream';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  first,
  share,
  takeUntil,
} from 'rxjs/operators';
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
type UpgradeHook = (...args: any[]) => any;
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
  /**
   * How many milliseconds an upgrade request for a path that no gateway serves
   * is left open when another `upgrade` listener on the same server may claim
   * it. A socket that nothing has been written to by then is closed. Raise it
   * when another listener answers the handshake late, for example after a slow
   * authentication, or set it to `0` to leave such sockets to the other
   * listeners entirely.
   *
   * @default 1000
   */
  unclaimedUpgradeTimeout?: number;
  /**
   * The largest message, in bytes, a client may send. A client that sends a
   * larger one is disconnected with the close code 1009. The `maxPayload`
   * option of a gateway takes precedence. Set it to `0` to lift the limit.
   *
   * @default 1048576 (1 MB)
   */
  maxPayload?: number;
};

const UNDERLYING_HTTP_SERVER_PORT = 0;
// How many messages of a client are handled at the same time
const DEFAULT_MAX_CONCURRENT_MESSAGES = 1000;
// Reading from a client stops while more than this is queued for it
const SEND_BUFFER_HIGH_WATER_MARK = 1024 * 1024;
const DEFAULT_MAX_SEND_BUFFER_SIZE = 128 * 1024 * 1024;
const DEFAULT_UNCLAIMED_UPGRADE_TIMEOUT = 1000;
// How often a client that is not read from is pinged, to find out whether it
// is still there. One that has left is noticed by the second ping at the
// latest: the first may still be accepted, and answered with a reset.
const PAUSED_CLIENT_PING_INTERVAL = 5000;
// ws takes up to 100 MB by default, and the default parser runs JSON.parse()
// on the whole message at once, before any guard can run
const DEFAULT_MAX_PAYLOAD = 1024 * 1024;

/**
 * A limit that is missing, or that is not a number (e.g. NaN from
 * "Number(process.env.UNSET)"), gets its default: none of the checks on a
 * limit trips for NaN, so keeping it would turn the limit off. 0 and
 * Infinity are kept.
 */
function resolveLimit(value: number | undefined, defaultValue: number) {
  return value == null || isNaN(value) ? defaultValue : value;
}

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
  // The "host" each port opened here listens on: that of the gateway the port
  // was opened for, which every other gateway on the port shares
  private readonly hostsRegistry = new Map<
    HttpServerRegistryKey,
    string | undefined
  >();
  protected messageParser: WsMessageParser = (data: WsData) => {
    return JSON.parse(data.toString());
  };
  protected readonly maxConcurrentMessages: number;
  protected readonly maxSendBufferSize: number;
  protected readonly unclaimedUpgradeTimeout: number;
  protected readonly maxPayload: number;
  // How many gateways hold each client back. Gateways that share a server
  // bind their handlers to the same client, and a single resume() undoes
  // every pause().
  private readonly pauseRequests = new WeakMap<object, number>();
  // Upgrade requests whose "handleProtocols" threw, which ws goes on to
  // complete anyway
  private readonly refusedUpgrades = new WeakSet<object>();

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: WsAdapterOptions,
  ) {
    super(appOrHttpServer);
    wsPackage = loadPackage('ws', 'WsAdapter', () => require('ws'));

    if (options?.messageParser) {
      this.messageParser = options.messageParser;
    }
    this.maxConcurrentMessages = resolveLimit(
      options?.maxConcurrentMessages,
      DEFAULT_MAX_CONCURRENT_MESSAGES,
    );
    this.maxSendBufferSize = resolveLimit(
      options?.maxSendBufferSize,
      DEFAULT_MAX_SEND_BUFFER_SIZE,
    );
    this.unclaimedUpgradeTimeout = resolveLimit(
      options?.unclaimedUpgradeTimeout,
      DEFAULT_UNCLAIMED_UPGRADE_TIMEOUT,
    );
    this.maxPayload = resolveLimit(options?.maxPayload, DEFAULT_MAX_PAYLOAD);
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
      maxPayload?: number;
      verifyClient?: UpgradeHook;
      handleProtocols?: UpgradeHook;
    };
    // A copy, so the gateway's options are left as they are. ws reads an
    // undefined (or NaN) "maxPayload" as no limit at all.
    wsOptions.maxPayload = resolveLimit(wsOptions.maxPayload, this.maxPayload);
    this.guardUpgradeHooks(wsOptions);
    this.ensureNoNamespace(wsOptions);

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
      if (httpServer) {
        // ws listens with "host" and "backlog" only on a server it creates
        // itself, and the one below has none (noServer)
        httpServer.listen(port, wsOptions.host, wsOptions.backlog);
        this.hostsRegistry.set(port, wsOptions.host);
      } else {
        this.ensureSameHost(port, path, wsOptions.host);
      }

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

  /**
   * Creates the server of a gateway without a port in an application without
   * an HTTP server, such as a standalone microservice. It does not listen,
   * so no client ever connects to it.
   */
  public createWithoutListener(
    options?: Record<string, any> & {
      namespace?: string;
      server?: any;
      path?: string;
    },
  ) {
    const { server: _, path: __, ...wsOptions } = options ?? {};
    this.ensureNoNamespace(wsOptions);
    return this.bindErrorHandler(
      new wsPackage.Server({ ...wsOptions, noServer: true }),
    );
  }

  private ensureNoNamespace(options: { namespace?: string }) {
    if (options.namespace) {
      const error = new Error(
        '"WsAdapter" does not support namespaces. If you need namespaces in your project, consider using the "@nestjs/platform-socket.io" package instead.',
      );
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Gateways with a port of their own and different paths share one server,
   * which listens on the "host" of the gateway it was opened for. A gateway
   * that joins it with another "host" would be served on addresses its own
   * "host" was meant to keep it off, so the application does not start.
   */
  private ensureSameHost(port: number, path: string, host?: string) {
    const listeningHost = this.hostsRegistry.get(port);
    if (host === listeningHost) {
      return;
    }
    if (isNil(host)) {
      this.logger.warn(
        `The gateway with the path "${path}" sets no "host", but shares port ${port} with gateways that listen on the host "${listeningHost}" only, so it does too.`,
      );
      return;
    }
    const error = new Error(
      `The gateway with the path "${path}" sets the host "${host}", but shares port ${port} with gateways that listen on ${isNil(listeningHost) ? 'every address' : `the host "${listeningHost}"`}. Set the same "host" on every gateway of a port, or give the gateway a port of its own.`,
    );
    this.logger.error(error);
    throw error;
  }

  /**
   * ws calls "verifyClient" and "handleProtocols" while it handles an upgrade
   * request, and catches nothing they throw. On a server that ws creates
   * itself (a port without a path) nothing else does either, and a promise
   * that "verifyClient" returns is not waited for on any server. An error in
   * a gateway's check of what a client sent would end the process, and
   * without a callback, a promise would let every client in. Here an error is
   * logged and the client is refused, and a promise is waited for.
   */
  protected guardUpgradeHooks(wsOptions: {
    verifyClient?: UpgradeHook;
    handleProtocols?: UpgradeHook;
  }) {
    const { verifyClient, handleProtocols } = wsOptions;
    if (isFunction(verifyClient)) {
      // ws tells the two forms apart the same way
      const takesCallback = verifyClient.length === 2;
      wsOptions.verifyClient = (info: unknown, callback: UpgradeHook) => {
        // A function that fails after it has called back must not answer
        // again
        let isSettled = false;
        const settle = (...verdict: unknown[]) => {
          if (!isSettled) {
            isSettled = true;
            callback(...verdict);
          }
        };
        const refuse = (err: unknown) => {
          this.logger.error(err);
          settle(false, 500);
        };
        let result: any;
        try {
          result = takesCallback
            ? verifyClient(info, settle)
            : verifyClient(info);
        } catch (err) {
          return refuse(err);
        }
        if (isFunction(result?.then)) {
          Promise.resolve(result)
            .then(verdict => !takesCallback && settle(verdict))
            .catch(refuse);
        } else if (!takesCallback) {
          settle(result);
        }
      };
    }
    if (isFunction(handleProtocols)) {
      wsOptions.handleProtocols = (
        protocols: Set<string>,
        request: http.IncomingMessage,
      ) => {
        try {
          return handleProtocols(protocols, request);
        } catch (err) {
          // ws completes the handshake whatever this returns, without a
          // subprotocol for a falsy value, so the client is cut off here and
          // its connection is not handed to the gateway (bindClientConnect)
          this.logger.error(err);
          this.refusedUpgrades.add(request);
          request.socket.destroy();
          return false;
        }
      };
    }
  }

  public bindClientConnect(server: any, callback: Function) {
    server.on(CONNECTION_EVENT, (client: any, request: any, ...rest: any[]) => {
      if (request && this.refusedUpgrades.has(request)) {
        return;
      }
      callback(client, request, ...rest);
    });
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
    // pile up, and resumes once it has caught up with every gateway whose
    // handlers are bound to it.
    let isBacklogged = false;
    let pendingReplies = 0;
    let isPaused = false;
    // A socket that is neither read from nor written to does not learn that
    // the client has left, as the end of the connection waits behind the data
    // not read yet, so "close" never comes. Handlers that never complete would
    // then keep the client paused, and themselves running, for good. So a
    // client that is not read from is pinged from time to time: the write
    // fails once the client is gone, which closes the socket. A client with
    // data queued for it has a write pending already.
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    const pingPausedClient = () => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        clearInterval(pingTimer);
      } else if (!client.bufferedAmount) {
        client.ping?.();
      }
    };
    const updatePaused = () => {
      const shouldPause =
        isBacklogged ||
        (pendingReplies > 0 &&
          client.bufferedAmount > SEND_BUFFER_HIGH_WATER_MARK);
      if (shouldPause === isPaused) {
        return;
      }
      isPaused = shouldPause;
      clearInterval(pingTimer);
      if (isPaused) {
        pingTimer = setInterval(pingPausedClient, PAUSED_CLIENT_PING_INTERVAL);
        pingTimer.unref?.();
      }
      const pauseRequests =
        (this.pauseRequests.get(client) ?? 0) + (isPaused ? 1 : -1);
      this.pauseRequests.set(client, pauseRequests);
      if (isPaused && pauseRequests === 1) {
        client.pause?.();
      } else if (!isPaused && pauseRequests === 0) {
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
      finalize(() => clearInterval(pingTimer)),
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
    this.hostsRegistry.clear();
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
      let pathname: string;
      try {
        const baseUrl = 'ws://' + request.headers.host + '/';
        pathname = new URL(request.url!, baseUrl).pathname;
      } catch {
        return this.abortUpgrade(socket, 400);
      }
      // A listener of the "connection" event runs within handleUpgrade()
      let client: { terminate(): void } | undefined;
      try {
        const wsServersCollection = this.wsServersRegistry.get(port)!;

        let isRequestDelegated = false;
        for (const wsServer of wsServersCollection) {
          if (pathname === wsServer.path) {
            wsServer.handleUpgrade(request, socket, head, (ws: any) => {
              client = ws;
              wsServer.emit('connection', ws, request);
            });
            isRequestDelegated = true;
            break;
          }
        }
        // Another upgrade listener on the same server (e.g. GraphQL
        // subscriptions) may own this path, so the socket is closed only when
        // no other listener can claim it. Node removes its own listeners from
        // the socket before emitting "upgrade", so a connection reset on a
        // socket that nobody claims would raise an unhandled "error" event.
        if (!isRequestDelegated) {
          socket.on(ERROR_EVENT, () => socket.destroy());
          if (httpServer.listenerCount('upgrade') <= 1) {
            socket.destroy();
          } else if (this.unclaimedUpgradeTimeout > 0) {
            // A listener that claims the socket answers the handshake, so a
            // socket nothing has been written to by then is one that nobody
            // claimed. The HTTP server's timeouts no longer apply after
            // "upgrade", so it would otherwise stay open until the client
            // hangs up. engine.io handles the same case this way. The count
            // covers the whole connection, so on a keep-alive connection it
            // already includes the responses to earlier requests.
            const writtenBeforeUpgrade = (socket as Socket).bytesWritten;
            setTimeout(() => {
              if (
                socket.writable &&
                (socket as Socket).bytesWritten <= writtenBeforeUpgrade
              ) {
                socket.destroy();
              }
            }, this.unclaimedUpgradeTimeout).unref();
          }
        }
      } catch (err) {
        // What went wrong is for the logs, not for the client
        this.logger.error(err);
        if (client) {
          client.terminate();
        } else {
          this.abortUpgrade(socket, 500);
        }
      }
    });
    return httpServer;
  }

  /**
   * Answers an upgrade request with an error status and closes its socket.
   * Node hands the socket over without listeners of its own, and end() only
   * half-closes it. A client resetting the connection afterwards would raise
   * an unhandled 'error' event, and one that never closes would keep the
   * socket open. ws's own abortHandshake() does the same.
   */
  protected abortUpgrade(socket: Duplex, statusCode: number) {
    socket.on(ERROR_EVENT, () => socket.destroy());
    socket.once('finish', () => socket.destroy());
    socket.end(
      `HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode]}\r\n` +
        'Connection: close\r\nContent-Length: 0\r\n\r\n',
    );
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
