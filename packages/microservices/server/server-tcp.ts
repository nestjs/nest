import type { Type } from '@nestjs/common';
import * as net from 'net';
import { Server as NetSocket, Socket } from 'net';
import { createServer as tlsCreateServer, TlsOptions } from 'tls';
import {
  EADDRINUSE,
  ECONNREFUSED,
  NO_MESSAGE_HANDLER,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants.js';
import { TcpContext } from '../ctx-host/tcp.context.js';
import { Transport } from '../enums/index.js';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events.js';
import { JsonSocket, TcpSocket } from '../helpers/index.js';
import { InvalidTcpDataReceptionException } from '../errors/invalid-tcp-data-reception.exception.js';
import {
  IncomingRequest,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import {
  TcpOptions,
  TransportId,
} from '../interfaces/microservice-configuration.interface.js';
import { Server } from './server.js';
import { isUndefined } from '@nestjs/common/internal';

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

  constructor(private readonly options: Required<TcpOptions>['options']) {
    super();
    this.port = this.getOptionsProp(options, 'port', TCP_DEFAULT_PORT);
    this.host = this.getOptionsProp(options, 'host', TCP_DEFAULT_HOST);
    this.socketClass = this.getOptionsProp(options, 'socketClass', JsonSocket);
    this.tlsOptions = this.getOptionsProp(options, 'tlsOptions');
    this.maxBufferSize = this.getOptionsProp(options, 'maxBufferSize');
    this.incompleteMessageTimeout = this.getOptionsProp(
      options,
      'incompleteMessageTimeout',
    );
    this.maxSendBufferSize = this.getOptionsProp(options, 'maxSendBufferSize');

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
    readSocket.on('message', (msg: ReadPacket & PacketId) =>
      this.handleMessage(readSocket, msg).catch(err => this.handleError(err)),
    );
    readSocket.on(TcpEventsMap.ERROR, err => {
      const invalidError = new InvalidTcpDataReceptionException(err);
      this.handleError(invalidError as any);
    });
  }

  public async handleMessage(socket: TcpSocket, rawMessage: unknown) {
    const packet = await this.deserializer.deserialize(rawMessage);
    const pattern = this.getPatternAsString(packet.pattern);

    const tcpContext = new TcpContext([socket, pattern, packet.metadata]);
    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(pattern, packet, tcpContext);
    }

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
    return this.handleRequest(
      tcpContext,
      async () =>
        this.transformToObservable(await handler(packet.data, tcpContext)),
      data => {
        Object.assign(data, { id: (packet as IncomingRequest).id });
        const outgoingResponse = this.serializer.serialize(
          data as WritePacket & PacketId,
        );

        socket.sendMessage(outgoingResponse);
      },
    );
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

  protected getSocketInstance(socket: Socket): TcpSocket {
    // Pass the framing options only if socketClass is JsonSocket
    // For custom socket classes, users should handle them in their own implementation
    const hasJsonSocketOptions =
      this.maxBufferSize !== undefined ||
      this.incompleteMessageTimeout !== undefined ||
      this.maxSendBufferSize !== undefined;

    if (hasJsonSocketOptions && this.socketClass === JsonSocket) {
      return new this.socketClass(socket, {
        maxBufferSize: this.maxBufferSize,
        incompleteMessageTimeout: this.incompleteMessageTimeout,
        maxSendBufferSize: this.maxSendBufferSize,
      });
    }
    return new this.socketClass(socket);
  }
}
