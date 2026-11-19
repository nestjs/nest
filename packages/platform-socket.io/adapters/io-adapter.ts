import {
  AbstractWsAdapter,
  type MessageMappingProperties,
} from '@nestjs/websockets';
import { defer, EMPTY, fromEvent, Observable } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  first,
  map,
  share,
  takeUntil,
} from 'rxjs/operators';
import { Namespace, Server, ServerOptions, Socket } from 'socket.io';
import { type INestApplicationContext, Logger } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/internal';
import { DISCONNECT_EVENT } from '@nestjs/websockets/internal';
import { hasRepeatedBinary } from '../utils/has-repeated-binary.util.js';
import { mergeMapBounded } from '../utils/merge-map-bounded.util.js';

// How many messages of one event a client may have handled at the same time.
// Kept here, like mergeMapBounded(), so that this package still loads with an
// older `@nestjs/websockets`.
const DEFAULT_MAX_CONCURRENT_MESSAGES = 1000;
const DEFAULT_MAX_WAITING_MESSAGES = 10000;
const DEFAULT_GRACE_PERIOD = 10000;
const MAX_TIMEOUT = 2_147_483_647;

/**
 * @publicApi
 */
export type IoAdapterOptions = {
  /**
   * How many messages of one event a client may have handled at the same
   * time. Later ones wait for their turn. Set it to `Infinity` to lift the
   * limit.
   *
   * @default 1000
   */
  maxConcurrentMessages?: number;
  /**
   * How many messages of one event a client may have waiting for their turn.
   * socket.io cannot be told to stop reading from a client, so one that sends
   * more is disconnected. Set it to `Infinity` to lift the limit.
   *
   * @default 10000
   */
  maxWaitingMessages?: number;
  /**
   * When `true`, `close()` rejects new connections, stops accepting new events
   * on connected sockets without firing `disconnect`, waits up to
   * `gracePeriod` milliseconds for in-flight handlers to finish, and closes
   * underlying Engine.IO transports via `socket.conn.close()` so clients can
   * reconnect automatically.
   *
   * @default false
   */
  gracefulShutdown?: boolean;
  /**
   * Maximum time in milliseconds to wait for active message handlers to finish
   * during graceful shutdown before closing remaining clients.
   *
   * @default 10000
   */
  gracePeriod?: number;
};

/**
 * A limit that is missing, or that is not a number (e.g. NaN from
 * "Number(process.env.UNSET)"), gets its default: none of the checks on a
 * limit trips for NaN, so keeping it would turn the limit off. 0 and
 * Infinity are kept.
 */
function resolveLimit(value: number | undefined, defaultValue: number) {
  return value == null || isNaN(value) ? defaultValue : value;
}

/**
 * @publicApi
 */
export class IoAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(IoAdapter.name);
  protected readonly maxConcurrentMessages: number;
  protected readonly maxWaitingMessages: number;
  protected readonly gracefulShutdown: boolean;
  protected readonly gracePeriod: number;
  private readonly disconnectMap = new WeakMap<Socket, Observable<any>>();
  private readonly closingSockets = new WeakSet<Socket>();
  private readonly activeHandlers = new WeakMap<Socket, number>();
  private readonly drainWaiters = new WeakMap<Socket, Set<() => void>>();
  private readonly closingServers = new WeakMap<Server, Promise<void>>();

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: IoAdapterOptions,
  ) {
    super(appOrHttpServer);
    this.maxConcurrentMessages = resolveLimit(
      options?.maxConcurrentMessages,
      DEFAULT_MAX_CONCURRENT_MESSAGES,
    );
    this.maxWaitingMessages = resolveLimit(
      options?.maxWaitingMessages,
      DEFAULT_MAX_WAITING_MESSAGES,
    );
    this.gracefulShutdown = Boolean(options?.gracefulShutdown);
    const rawGracePeriod = resolveLimit(
      options?.gracePeriod,
      DEFAULT_GRACE_PERIOD,
    );
    this.gracePeriod = Math.min(Math.max(0, rawGracePeriod), MAX_TIMEOUT);
  }

  public create(
    port: number,
    options?: ServerOptions & { namespace?: string; server?: Server },
  ): Server | Namespace {
    if (!options) {
      return this.createIOServer(port);
    }
    const { namespace, server, ...opt } = options;
    return server && namespace && isFunction(server.of)
      ? server.of(namespace)
      : namespace
        ? this.createIOServer(port, opt).of(namespace)
        : this.createIOServer(port, opt);
  }

  /**
   * Creates the server of a gateway without a port in an application without
   * an HTTP server, such as a standalone microservice. It is not attached to
   * any port, but it can still broadcast, e.g. through an adapter shared with
   * other processes. It is created through `createIOServer()`, with
   * `undefined` for the port, so that a subclass can set it up as any other.
   */
  public createWithoutListener(
    options?: ServerOptions & { namespace?: string; server?: Server },
  ): Server | Namespace {
    if (!options) {
      return this.createIOServer(undefined);
    }
    const { namespace, server: _, ...opt } = options;
    const server = this.createIOServer(undefined, opt);
    return namespace ? server.of(namespace) : server;
  }

  /**
   * @param port `0` for the HTTP server of the application, if the adapter
   * has one, `undefined` for a server that is not attached to any port (see
   * `createWithoutListener()`)
   */
  public createIOServer(
    port: number | undefined,
    options?: ServerOptions,
  ): Server {
    if (this.httpServer && port === 0) {
      return new Server(this.httpServer, options);
    }
    return new Server(port, options);
  }

  public bindMessageHandlers(
    socket: Socket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    let disconnect$ = this.disconnectMap.get(socket);
    if (!disconnect$) {
      disconnect$ = fromEvent(socket, DISCONNECT_EVENT).pipe(share(), first());
      this.disconnectMap.set(socket, disconnect$);
    }

    handlers.forEach(({ message, callback, isAckHandledManually }) => {
      const source$ = fromEvent(socket, message).pipe(
        filter(() => !this.closingSockets.has(socket)),
        // No Socket.IO client sends a message that refers to the same binary
        // value more than once, so the client is disconnected
        filter((payload: unknown) => {
          if (!hasRepeatedBinary(payload)) {
            return true;
          }
          this.disconnectClient(
            socket,
            `Disconnecting a client whose "${String(message)}" message refers to the same binary data more than once`,
          );
          return false;
        }),
        // How many messages are pending at once is up to the client: engine.io
        // hands over a whole polling payload before any handler can settle,
        // and goes on reading while the messages wait for their turn.
        mergeMapBounded(
          (payload: any) => {
            const { data, ack } = this.mapPayload(payload);
            // defer turns a sync throw into an error notification and
            // catchError stops it from tearing down this event's stream, which
            // would silence that event for the client. A handler whose error
            // filter rethrows is an app bug, so the failure gets logged instead
            // of dropped silently.
            return defer(() => {
              this.incrementActiveHandlers(socket);
              return transform(callback(data, ack));
            }).pipe(
              filter((response: any) => !isNil(response)),
              map((response: any) => [response, ack, isAckHandledManually]),
              catchError(err => {
                this.logger.error(err);
                return EMPTY;
              }),
              finalize(() => this.decrementActiveHandlers(socket)),
            );
          },
          this.maxConcurrentMessages,
          undefined,
          this.maxWaitingMessages,
          () => this.disconnectOverflowingClient(socket, message),
        ),
        takeUntil(disconnect$),
      );
      source$.subscribe(([response, ack, isAckHandledManually]) => {
        // socket.io's encoder walks the payload recursively, so a response
        // echoing a client-controlled payload nested deep enough overflows the
        // stack. A throw here escapes the subscriber, which RxJS rethrows
        // asynchronously, killing the process.
        try {
          if (response.event) {
            return socket.emit(response.event, response.data);
          }
          if (!isAckHandledManually && isFunction(ack)) {
            ack(response);
          }
        } catch (err) {
          this.logger.error(err);
        }
      });
    });
  }

  /**
   * Disconnects a client with more than "maxWaitingMessages" messages of one
   * event waiting. The whole connection is closed, not only the namespace,
   * which the client could join again at once. The "disconnect" event ends
   * the client's message streams, which drops the messages still waiting.
   */
  protected disconnectOverflowingClient(socket: Socket, message: unknown) {
    this.disconnectClient(
      socket,
      `Disconnecting a client with more than "maxWaitingMessages" (${this.maxWaitingMessages}) "${String(message)}" messages waiting to be handled`,
    );
  }

  private disconnectClient(socket: Socket, warning: string) {
    // Called from the client's message stream, where a throw would end the
    // process, e.g. from a disconnect hook
    try {
      if (!socket.connected) {
        return;
      }
      this.logger.warn(warning);
      socket.disconnect(true);
    } catch (err) {
      this.logger.error(err);
    }
  }

  public mapPayload(payload: unknown): { data: any; ack?: Function } {
    if (!Array.isArray(payload)) {
      if (isFunction(payload)) {
        return { data: undefined, ack: payload };
      }
      return { data: payload };
    }
    const lastElement = payload[payload.length - 1];
    const isAck = isFunction(lastElement);
    if (isAck) {
      const size = payload.length - 1;
      return {
        data: size === 1 ? payload[0] : payload.slice(0, size),
        ack: lastElement,
      };
    }
    return { data: payload };
  }

  public bindClientDisconnect(client: Socket, callback: Function) {
    client.once(DISCONNECT_EVENT, (reason: string) => callback(reason));
  }

  public async close(server: Server | Namespace): Promise<void> {
    const rootServer = this.resolveRootServer(server);
    if (rootServer instanceof Server && !rootServer.engine) {
      // Not attached to any port (see createWithoutListener()), and close()
      // would fail on the engine it does not have, so only the adapters of
      // its namespaces are closed, e.g. to disconnect from a shared store
      await Promise.allSettled(
        [...rootServer._nsps.values()].map(namespace =>
          namespace.adapter.close(),
        ),
      );
      return;
    }

    if (!this.gracefulShutdown) {
      if (
        this.forceCloseConnections &&
        (server as Server).httpServer === this.httpServer
      ) {
        return;
      }
      return super.close(server);
    }

    const existingClose = this.closingServers.get(rootServer);
    if (existingClose) {
      return existingClose;
    }

    const closePromise = this.closeGracefully(rootServer);
    this.closingServers.set(rootServer, closePromise);
    return closePromise;
  }

  private resolveRootServer(server: Server | Namespace): Server {
    if (server instanceof Server) {
      return server;
    }
    return ((server as any)?.server ?? server) as Server;
  }

  private incrementActiveHandlers(socket: Socket) {
    this.activeHandlers.set(socket, (this.activeHandlers.get(socket) ?? 0) + 1);
  }

  private decrementActiveHandlers(socket: Socket) {
    const next = (this.activeHandlers.get(socket) ?? 0) - 1;
    if (next > 0) {
      this.activeHandlers.set(socket, next);
      return;
    }
    this.activeHandlers.delete(socket);
    const waiters = this.drainWaiters.get(socket);
    if (waiters) {
      this.drainWaiters.delete(socket);
      waiters.forEach(resolve => resolve());
    }
  }

  private async closeGracefully(rootServer: Server): Promise<void> {
    // Reject new Engine.IO handshakes while draining active handlers
    if (rootServer.engine?.opts) {
      rootServer.engine.opts.allowRequest = (_req, callback) => {
        callback('Server is shutting down', false);
      };
    }

    const sockets = new Set<Socket>();
    if (rootServer._nsps) {
      for (const namespace of rootServer._nsps.values()) {
        for (const socket of namespace.sockets.values()) {
          sockets.add(socket);
        }
      }
    }

    for (const socket of sockets) {
      this.closingSockets.add(socket);
    }

    if (sockets.size > 0) {
      await this.drainSockets(sockets);
    }

    for (const socket of sockets) {
      if (socket.connected) {
        if (typeof socket.conn?.close === 'function') {
          // Close the underlying Engine.IO transport without sending a
          // Socket.IO DISCONNECT packet so clients reconnect automatically
          socket.conn.close();
        } else {
          socket.disconnect(true);
        }
      }
    }

    if (
      this.forceCloseConnections &&
      rootServer.httpServer === this.httpServer
    ) {
      if (rootServer._nsps) {
        await Promise.allSettled(
          [...rootServer._nsps.values()].map(namespace =>
            namespace.adapter.close(),
          ),
        );
      }
      return;
    }

    return super.close(rootServer);
  }

  private async drainSockets(sockets: Set<Socket>): Promise<void> {
    const cleanups: Array<() => void> = [];

    const waitForDrain = (socket: Socket): Promise<void> => {
      if (!this.activeHandlers.get(socket) || !socket.connected) {
        return Promise.resolve();
      }
      return new Promise<void>(resolve => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }
          settled = true;
          socket.removeListener?.(DISCONNECT_EVENT, done);
          const set = this.drainWaiters.get(socket);
          set?.delete(done);
          if (set?.size === 0) {
            this.drainWaiters.delete(socket);
          }
          resolve();
        };
        let waiters = this.drainWaiters.get(socket);
        if (!waiters) {
          waiters = new Set();
          this.drainWaiters.set(socket, waiters);
        }
        waiters.add(done);
        socket.once?.(DISCONNECT_EVENT, done);
        cleanups.push(done);
      });
    };

    const drainPromises = [...sockets].map(waitForDrain);
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<void>(resolve => {
      graceTimer = setTimeout(() => {
        let remaining = 0;
        for (const socket of sockets) {
          if ((this.activeHandlers.get(socket) ?? 0) > 0) {
            remaining++;
          }
        }
        if (remaining > 0) {
          this.logger.warn(
            `Graceful shutdown timed out after ${this.gracePeriod}ms; forcibly closing ${remaining} Socket.IO client(s) with active handlers.`,
          );
        }
        resolve();
      }, this.gracePeriod);
      graceTimer.unref?.();
    });

    try {
      await Promise.race([Promise.all(drainPromises), timeoutPromise]);
    } finally {
      clearTimeout(graceTimer);
      cleanups.forEach(fn => fn());
    }
  }
}
