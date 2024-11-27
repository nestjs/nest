import { Type } from '@nestjs/common';
import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import * as net from 'net';
import { Server as NetSocket, Socket } from 'net';
import { createServer as tlsCreateServer, TlsOptions } from 'tls';
import {
  EADDRINUSE,
  ECONNREFUSED,
  NO_MESSAGE_HANDLER,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants';
import { TcpContext } from '../ctx-host/tcp.context';
import { Transport } from '../enums';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events';
import { JsonSocket, TcpSocket } from '../helpers';
import {
  IncomingRequest,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import { TcpOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

/**
 * @publicApi
 */
export class ServerTCP extends Server<TcpEvents, TcpStatus> {
  public readonly transportId = Transport.TCP;

  protected server: NetSocket;
  protected readonly port: number;
  protected readonly host: string;
  protected readonly socketClass: Type<TcpSocket>;
  protected isManuallyTerminated = false;
  protected retryAttemptsCount = 0;
  protected tlsOptions?: TlsOptions;
  protected pendingEventListeners: Array<{
    event: keyof TcpEvents;
    callback: TcpEvents[keyof TcpEvents];
  }> = [];

  constructor(private readonly options: Required<TcpOptions>['options']) {
    super();
    this.port = this.getOptionsProp(options, 'port', TCP_DEFAULT_PORT);
    this.host = this.getOptionsProp(options, 'host', TCP_DEFAULT_HOST);
    this.socketClass = this.getOptionsProp(options, 'socketClass', JsonSocket);
    this.tlsOptions = this.getOptionsProp(options, 'tlsOptions');

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
    this.pendingEventListeners = [];
  }

  public bindHandler(socket: Socket) {
    const readSocket = this.getSocketInstance(socket);
    readSocket.on('message', async (msg: ReadPacket & PacketId) =>
      this.handleMessage(readSocket, msg),
    );
    readSocket.on(TcpEventsMap.ERROR, this.handleError.bind(this));
  }

  public async handleMessage(socket: TcpSocket, rawMessage: unknown) {
    const packet = await this.deserializer.deserialize(rawMessage);
    const pattern = !isString(packet.pattern)
      ? JSON.stringify(packet.pattern)
      : packet.pattern;

    const tcpContext = new TcpContext([socket, pattern]);
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
    const response$ = this.transformToObservable(
      await handler(packet.data, tcpContext),
    );

    response$ &&
      this.send(response$, data => {
        Object.assign(data, { id: (packet as IncomingRequest).id });
        const outgoingResponse = this.serializer.serialize(
          data as WritePacket & PacketId,
        );
        socket.sendMessage(outgoingResponse);
      });
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

  protected getSocketInstance(socket: Socket): TcpSocket {
    return new this.socketClass(socket);
  }
}
