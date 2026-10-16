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
import {
  DEFAULT_MAX_CONCURRENT_MESSAGES,
  DISCONNECT_EVENT,
  mergeMapBounded,
} from '@nestjs/websockets/internal';

type IoAdapterOptions = {
  /**
   * How many messages of one event a client may have handled at the same
   * time. Later ones wait for their turn. Set it to `Infinity` to lift the
   * limit.
   *
   * @default 1000
   */
  maxConcurrentMessages?: number;
};

/**
 * @publicApi
 */
export class IoAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(IoAdapter.name);
  protected readonly maxConcurrentMessages: number;
  private readonly disconnectMap = new WeakMap<Socket, Observable<any>>();

  constructor(
    appOrHttpServer?: INestApplicationContext | object,
    options?: IoAdapterOptions,
  ) {
    super(appOrHttpServer);
    this.maxConcurrentMessages =
      options?.maxConcurrentMessages ?? DEFAULT_MAX_CONCURRENT_MESSAGES;
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

  public createIOServer(port: number, options?: ServerOptions): Server {
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
        // How many messages are pending at once is up to the client: engine.io
        // hands over a whole polling payload before any handler can settle.
        mergeMapBounded((payload: any) => {
          const { data, ack } = this.mapPayload(payload);
          // defer turns a sync throw into an error notification and catchError
          // stops it from tearing down this event's stream, which would silence
          // that event for the client. A handler whose error filter rethrows is
          // an app bug, so the failure gets logged instead of dropped silently.
          return defer(() => transform(callback(data, ack))).pipe(
            filter((response: any) => !isNil(response)),
            map((response: any) => [response, ack, isAckHandledManually]),
            catchError(err => {
              this.logger.error(err);
              return EMPTY;
            }),
          );
        }, this.maxConcurrentMessages),
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
    if (this.forceCloseConnections && server.httpServer === this.httpServer) {
      return;
    }

    return super.close(server);
  }
}
