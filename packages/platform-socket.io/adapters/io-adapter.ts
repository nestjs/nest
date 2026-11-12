import {
  AbstractWsAdapter,
  type MessageMappingProperties,
} from '@nestjs/websockets';
import { defer, EMPTY, fromEvent, Observable } from 'rxjs';
import {
  catchError,
  filter,
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

type IoAdapterOptions = {
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
  private readonly disconnectMap = new WeakMap<Socket, Observable<any>>();

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
            return defer(() => transform(callback(data, ack))).pipe(
              filter((response: any) => !isNil(response)),
              map((response: any) => [response, ack, isAckHandledManually]),
              catchError(err => {
                this.logger.error(err);
                return EMPTY;
              }),
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

  public async close(server: Server): Promise<void> {
    if (server instanceof Server && !server.engine) {
      // Not attached to any port (see createWithoutListener()), and close()
      // would fail on the engine it does not have, so only the adapters of
      // its namespaces are closed, e.g. to disconnect from a shared store
      await Promise.allSettled(
        [...server._nsps.values()].map(namespace => namespace.adapter.close()),
      );
      return;
    }
    if (this.forceCloseConnections && server.httpServer === this.httpServer) {
      return;
    }

    return super.close(server);
  }
}
