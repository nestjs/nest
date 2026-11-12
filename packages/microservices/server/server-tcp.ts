import { Type } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import * as net from 'net';
import { Server as NetSocket, Socket } from 'net';
import { isObservable, Observable, of, ReplaySubject } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { createServer as tlsCreateServer, TlsOptions } from 'tls';
import {
  EADDRINUSE,
  ECONNREFUSED,
  NO_MESSAGE_HANDLER,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants';
import { getHandlerObservableNotifier } from '../context/rpc-context-creator';
import { BaseRpcContext } from '../ctx-host/base-rpc.context';
import { TcpContext } from '../ctx-host/tcp.context';
import { Transport } from '../enums';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events';
import { JsonSocket, TcpSocket } from '../helpers';
import { InvalidTcpDataReceptionException } from '../errors/invalid-tcp-data-reception.exception';
import {
  IncomingRequest,
  MessageHandler,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import {
  TcpOptions,
  TransportId,
} from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

const DEFAULT_MAX_CONCURRENT_MESSAGES = 1000;

/**
 * @publicApi
 */
export class ServerTCP extends Server<TcpEvents, TcpStatus> {
  public transportId: TransportId = Transport.TCP;

  protected server: NetSocket;
  protected readonly port: number;
  protected readonly host: string;
  protected readonly socketClass: Type<TcpSocket>;
  protected readonly maxBufferSize?: number;
  protected readonly incompleteMessageTimeout?: number;
  protected readonly maxSendBufferSize?: number;
  protected readonly drainTimeout?: number;
  protected readonly maxConcurrentMessages: number;
  protected isManuallyTerminated = false;
  protected retryAttemptsCount = 0;
  protected tlsOptions?: TlsOptions;
  protected pendingEventListeners: Array<{
    event: keyof TcpEvents;
    callback: TcpEvents[keyof TcpEvents];
  }> = [];
  /**
   * Sockets accepted by this server that are still open. "net.Server#close"
   * only stops the server from accepting new connections, so these are tracked
   * separately and torn down on "close" - otherwise the process outlives the
   * shutdown and handlers keep running on already established connections.
   */
  protected readonly openSockets = new Set<Socket>();
  /**
   * Notifiers that emit once a socket bound by "bindHandler" can no longer be
   * written to. They replay, so that a response stream that only starts after
   * the peer has gone ends right away as well.
   */
  protected readonly disconnectNotifiers = new WeakMap<
    TcpSocket,
    Observable<void>
  >();
  /**
   * How many messages of each socket are being handled.
   */
  protected readonly pendingMessages = new WeakMap<TcpSocket, number>();
  /**
   * What settles the message of a context, until the stream its handler
   * returned takes it over (see "takePendingMessageSettler").
   */
  protected readonly pendingMessageSettlers = new WeakMap<
    BaseRpcContext,
    () => void
  >();

  constructor(private readonly options: Required<TcpOptions>['options']) {
    super();
    // Present but empty, e.g. "host: process.env.HOST" with the variable
    // unset, means the default as well. Listening with no host would accept
    // connections on every interface rather than on localhost.
    this.port = this.getOptionsProp(options, 'port') ?? TCP_DEFAULT_PORT;
    this.host = this.getOptionsProp(options, 'host') || TCP_DEFAULT_HOST;
    this.socketClass =
      this.getOptionsProp(options, 'socketClass') ?? JsonSocket;
    this.tlsOptions = this.getOptionsProp(options, 'tlsOptions');
    this.maxBufferSize = this.getOptionsProp(options, 'maxBufferSize');
    this.incompleteMessageTimeout = this.getOptionsProp(
      options,
      'incompleteMessageTimeout',
    );
    this.maxSendBufferSize = this.getOptionsProp(options, 'maxSendBufferSize');
    this.drainTimeout = this.getOptionsProp(options, 'drainTimeout');
    // Not a number gets the default as well, and 0 lifts the limit
    const maxConcurrentMessages = this.getOptionsProp(
      options,
      'maxConcurrentMessages',
    );
    this.maxConcurrentMessages =
      maxConcurrentMessages == null || isNaN(maxConcurrentMessages)
        ? DEFAULT_MAX_CONCURRENT_MESSAGES
        : maxConcurrentMessages || Infinity;

    this.init();
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.server.once(TcpEventsMap.ERROR, (err: Record<string, unknown>) => {
      if (err?.code === EADDRINUSE || err?.code === ECONNREFUSED) {
        this._status$.next(TcpStatus.DISCONNECTED);

        return callback(err);
      }
    });
    this.server.listen(this.port, this.host, callback as () => void);
  }

  public close() {
    this.isManuallyTerminated = true;

    this.server.close();
    this.closeOpenSockets();
    this.pendingEventListeners = [];
  }

  public bindHandler(socket: Socket) {
    this.trackOpenSocket(socket);

    const readSocket = this.getSocketInstance(socket);
    this.trackDisconnect(readSocket);
    readSocket.on('message', (msg: ReadPacket & PacketId) =>
      this.handleMessage(readSocket, msg).catch(err => this.handleError(err)),
    );
    readSocket.on(TcpEventsMap.ERROR, err => {
      const invalidError = new InvalidTcpDataReceptionException(err);
      this.handleError(invalidError as any);
    });
  }

  public async handleMessage(socket: TcpSocket, rawMessage: unknown) {
    // Up to its first "await" this runs within the "message" event, so a
    // socket paused here emits no further message of the same read
    const settle = this.trackPendingMessage(socket);
    let tcpContext: TcpContext | undefined;
    try {
      const packet = await this.deserializer.deserialize(rawMessage);
      const pattern = this.getPatternAsString(packet.pattern);

      tcpContext = new TcpContext([socket, pattern]);
      this.pendingMessageSettlers.set(tcpContext, settle);
      return await this.dispatchMessage(socket, packet, pattern, tcpContext);
    } finally {
      // A message whose handler returned a stream is settled once that stream
      // is done (see "takePendingMessageSettler"). Any other is done with
      // now, as its handler, and the processing end hook, have run.
      if (!tcpContext || this.pendingMessageSettlers.delete(tcpContext)) {
        settle();
      }
    }
  }

  protected dispatchMessage(
    socket: TcpSocket,
    packet: ReadPacket,
    pattern: string,
    tcpContext: TcpContext,
  ) {
    if (isUndefined((packet as IncomingRequest).id)) {
      const handler = this.getHandlerByPattern(pattern);
      if (!handler || handler.isEventHandler) {
        return this.handleEvent(
          pattern,
          packet,
          tcpContext,
          handler && this.settleOnStreamEnd(handler, tcpContext),
        );
      }
      // A message handler is called without an id as well (ClientProxy#emit).
      // Nobody waits for its reply, but the stream it returns belongs to the
      // connection it was called over, as for a request. Event handlers stay
      // detached from the connection the event came from.
      return this.onProcessingStartHook(
        this.transportId,
        tcpContext,
        async () => {
          const response$ = this.endOnDisconnect(
            await handler(packet.data, tcpContext),
            tcpContext,
            socket,
          );
          const settle = this.takePendingMessageSettler(tcpContext);
          this.send(
            response$.pipe(
              finalize(() => {
                try {
                  this.onProcessingEndHook?.(this.transportId, tcpContext);
                } finally {
                  settle();
                }
              }),
            ),
            () => undefined,
          );
        },
      );
    }
    this.assertValidPacketId((packet as IncomingRequest).id);

    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      const status = 'error';
      const noHandlerPacket = this.serializer.serialize({
        id: (packet as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      });
      return socket.sendMessage(noHandlerPacket);
    }
    return this.onProcessingStartHook(
      this.transportId,
      tcpContext,
      async () => {
        const response$ = this.endOnDisconnect(
          await handler(packet.data, tcpContext),
          tcpContext,
          socket,
        );

        response$ &&
          this.send(
            response$.pipe(
              finalize(this.takePendingMessageSettler(tcpContext)),
            ),
            data => {
              Object.assign(data, { id: (packet as IncomingRequest).id });
              const outgoingResponse = this.serializer.serialize(
                data as WritePacket & PacketId,
              );

              this.onProcessingEndHook?.(this.transportId, tcpContext);
              socket.sendMessage(outgoingResponse);
            },
          );
      },
    );
  }

  /**
   * Counts a message of "socket" as pending, and asks the socket for no
   * further messages while "maxConcurrentMessages" of them are. How many a
   * peer sends before any of them is done is up to the peer, and each takes
   * up memory for as long as its handler, and the stream it returned, run.
   * Returns what to call, once, when the message is no longer pending.
   */
  protected trackPendingMessage(socket: TcpSocket): () => void {
    const pending = (this.pendingMessages.get(socket) ?? 0) + 1;
    this.pendingMessages.set(socket, pending);
    if (pending >= this.maxConcurrentMessages) {
      // A socket class written for an older version may lack it
      socket.pauseMessages?.();
    }

    let isPending = true;
    return () => {
      if (!isPending) {
        return;
      }
      isPending = false;
      const stillPending = this.pendingMessages.get(socket)! - 1;
      this.pendingMessages.set(socket, stillPending);
      // Nothing more is dispatched once the server is closed, including what
      // a socket has read but not emitted yet
      if (
        stillPending < this.maxConcurrentMessages &&
        !this.isManuallyTerminated
      ) {
        socket.resumeMessages?.();
      }
    };
  }

  /**
   * Keeps a message pending from the moment its handler has returned a stream
   * until that stream has settled. The caller settles the message by calling
   * what this returns, which does nothing if it was settled already.
   */
  protected takePendingMessageSettler(context: BaseRpcContext): () => void {
    const settle = this.pendingMessageSettlers.get(context);
    if (!settle) {
      return () => {};
    }
    this.pendingMessageSettlers.delete(context);
    return settle;
  }

  /**
   * Wraps an event handler, so that the message is kept pending until the
   * stream the handler returned, if any, has settled.
   */
  protected settleOnStreamEnd(
    handler: MessageHandler,
    context: BaseRpcContext,
  ): MessageHandler {
    return async (...args: Parameters<MessageHandler>) => {
      const result = await handler(...args);
      if (!isObservable(result)) {
        return result;
      }
      return result.pipe(finalize(this.takePendingMessageSettler(context)));
    };
  }

  public handleClose(): undefined | number | NodeJS.Timer {
    if (
      this.isManuallyTerminated ||
      !this.getOptionsProp(this.options, 'retryAttempts') ||
      this.retryAttemptsCount >=
        this.getOptionsProp(this.options, 'retryAttempts', 0)
    ) {
      return undefined;
    }
    ++this.retryAttemptsCount;
    return setTimeout(
      () => this.server.listen(this.port, this.host),
      this.getOptionsProp(this.options, 'retryDelay', 0),
    );
  }

  public unwrap<T>(): T {
    if (!this.server) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.server as T;
  }

  public on<
    EventKey extends keyof TcpEvents = keyof TcpEvents,
    EventCallback extends TcpEvents[EventKey] = TcpEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.server) {
      this.server.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  protected init() {
    if (this.tlsOptions) {
      // TLS enabled, use tls server
      this.server = tlsCreateServer(
        this.tlsOptions,
        this.bindHandler.bind(this),
      );
      // "bindHandler" only runs once the TLS handshake is over. The raw socket
      // is tracked from the moment it is accepted, so that "close" also tears
      // down connections that are still in the middle of their handshake.
      this.server.on('connection', socket => this.trackOpenSocket(socket));
    } else {
      // TLS disabled, use net server
      this.server = net.createServer(this.bindHandler.bind(this));
    }
    this.registerListeningListener(this.server);
    this.registerErrorListener(this.server);
    this.registerCloseListener(this.server);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.server.on(event, callback),
    );
    this.pendingEventListeners = [];
  }

  protected registerListeningListener(socket: net.Server) {
    socket.on(TcpEventsMap.LISTENING, () => {
      this._status$.next(TcpStatus.CONNECTED);
    });
  }

  protected registerErrorListener(socket: net.Server) {
    socket.on(TcpEventsMap.ERROR, err => {
      if ('code' in err && err.code === ECONNREFUSED) {
        this._status$.next(TcpStatus.DISCONNECTED);
      }
      this.handleError(err as any);
    });
  }

  protected registerCloseListener(socket: net.Server) {
    socket.on(TcpEventsMap.CLOSE, () => {
      this._status$.next(TcpStatus.DISCONNECTED);
      this.handleClose();
    });
  }

  /**
   * Keeps a reference to an accepted socket so that it can be destroyed when
   * the server is closed, and drops it again once it closes on its own.
   */
  protected trackOpenSocket(socket: Socket) {
    if (!socket) {
      return;
    }
    this.openSockets.add(socket);
    socket.on(TcpEventsMap.CLOSE, () => this.openSockets.delete(socket));
  }

  /**
   * Destroys every socket still open. Called on shutdown so that "close" does
   * not leave the process alive, and so that no further messages are dispatched
   * to handlers over connections established before the shutdown.
   */
  protected closeOpenSockets() {
    this.openSockets.forEach(socket => socket.destroy());
    this.openSockets.clear();
  }

  /**
   * Notes when the socket can no longer be written to: "TcpSocket" drops every
   * message once the socket has closed or errored.
   */
  protected trackDisconnect(socket: TcpSocket) {
    const disconnect$ = new ReplaySubject<void>(1);
    socket.on(TcpEventsMap.CLOSE, () => disconnect$.next());
    socket.on(TcpEventsMap.ERROR, () => disconnect$.next());
    this.disconnectNotifiers.set(socket, disconnect$);
  }

  /**
   * Turns a handler result into the response stream. As for HTTP, the stream
   * ends once the peer disconnects only if the handler itself returned (or
   * resolved to) an Observable: any other handler, and the interceptors
   * around it, run to completion.
   */
  protected endOnDisconnect(
    result: unknown,
    context: TcpContext,
    socket: TcpSocket,
  ): Observable<unknown> {
    const response$ = this.transformToObservable(result);
    const disconnect$ = this.disconnectNotifiers.get(socket);
    if (!isObservable(result) || !disconnect$) {
      return response$;
    }
    // Without interceptors, "result" is what the handler returned
    const handlerObservable$: Observable<unknown> =
      getHandlerObservableNotifier(context) ?? of(null);
    return response$.pipe(
      takeUntil(handlerObservable$.pipe(switchMap(() => disconnect$))),
    );
  }

  protected getSocketInstance(socket: Socket): TcpSocket {
    // Pass the framing options only if socketClass is JsonSocket
    // For custom socket classes, users should handle them in their own implementation
    const hasJsonSocketOptions =
      this.maxBufferSize !== undefined ||
      this.incompleteMessageTimeout !== undefined ||
      this.maxSendBufferSize !== undefined ||
      this.drainTimeout !== undefined;

    if (hasJsonSocketOptions && this.socketClass === JsonSocket) {
      return new this.socketClass(socket, {
        maxBufferSize: this.maxBufferSize,
        incompleteMessageTimeout: this.incompleteMessageTimeout,
        maxSendBufferSize: this.maxSendBufferSize,
        drainTimeout: this.drainTimeout,
      });
    }
    return new this.socketClass(socket);
  }
}
