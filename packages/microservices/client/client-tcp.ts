import { Logger, Type } from '@nestjs/common';
import * as net from 'net';
import { EmptyError, lastValueFrom } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import { ConnectionOptions, connect as tlsConnect, TLSSocket } from 'tls';
import { ECONNREFUSED, TCP_DEFAULT_HOST, TCP_DEFAULT_PORT } from '../constants';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events';
import { JsonSocket, TcpSocket } from '../helpers';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { TcpClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';

/**
 * @publicApi
 */
export class ClientTCP extends ClientProxy<TcpEvents, TcpStatus> {
  protected readonly logger = new Logger(ClientTCP.name);
  protected readonly port: number;
  protected readonly host: string;
  protected readonly socketClass: Type<TcpSocket>;
  protected readonly tlsOptions?: ConnectionOptions;
  protected socket: TcpSocket | null = null;
  protected connectionPromise: Promise<any> | null = null;
  protected pendingEventListeners: Array<{
    event: keyof TcpEvents;
    callback: TcpEvents[keyof TcpEvents];
  }> = [];

  constructor(options: Required<TcpClientOptions>['options']) {
    super();
    this.port = this.getOptionsProp(options, 'port', TCP_DEFAULT_PORT);
    this.host = this.getOptionsProp(options, 'host', TCP_DEFAULT_HOST);
    this.socketClass = this.getOptionsProp(options, 'socketClass', JsonSocket);
    this.tlsOptions = this.getOptionsProp(options, 'tlsOptions');

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public connect(): Promise<any> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.socket = this.createSocket();
    this.registerConnectListener(this.socket);
    this.registerCloseListener(this.socket);
    this.registerErrorListener(this.socket);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.socket!.on(event, callback as any),
    );
    this.pendingEventListeners = [];

    const source$ = this.connect$(this.socket.netSocket).pipe(
      tap(() => {
        this.socket!.on('message', (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer),
        );
      }),
      share(),
    );

    // For TLS connections, the connection is initiated when the socket is created
    if (!this.tlsOptions) {
      this.socket.connect(this.port, this.host);
    }
    this.connectionPromise = lastValueFrom(source$).catch(err => {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    });

    return this.connectionPromise;
  }

  public async handleResponse(buffer: unknown): Promise<void> {
    const { err, response, isDisposed, id } =
      await this.deserializer.deserialize(buffer);
    const callback = this.routingMap.get(id);
    if (!callback) {
      return undefined;
    }
    if (isDisposed || err) {
      return callback({
        err,
        response,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  public createSocket(): TcpSocket {
    let socket: net.Socket | TLSSocket;
    /**
     * TLS enabled, "upgrade" the TCP Socket to TLS
     */
    if (this.tlsOptions) {
      socket = tlsConnect({
        ...this.tlsOptions,
        port: this.port,
        host: this.host,
      });
    } else {
      socket = new net.Socket();
    }
    return new this.socketClass(socket);
  }

  public close() {
    this.socket && this.socket.end();
    this.handleClose();
    this.pendingEventListeners = [];
  }

  public registerConnectListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.CONNECT, () => {
      this._status$.next(TcpStatus.CONNECTED);
    });
  }

  public registerErrorListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.ERROR, err => {
      if (err.code !== ECONNREFUSED) {
        this.handleError(err);
      } else {
        this._status$.next(TcpStatus.DISCONNECTED);
      }
    });
  }

  public registerCloseListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.CLOSE, () => {
      this._status$.next(TcpStatus.DISCONNECTED);
      this.handleClose();
    });
  }

  public handleError(err: any) {
    this.logger.error(err);
  }

  public handleClose() {
    this.socket = null;
    this.connectionPromise = null;

    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
    }
  }

  public on<
    EventKey extends keyof TcpEvents = keyof TcpEvents,
    EventCallback extends TcpEvents[EventKey] = TcpEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.socket) {
      this.socket.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
    if (!this.socket) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.socket.netSocket as T;
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const serializedPacket = this.serializer.serialize(packet);

      this.routingMap.set(packet.id, callback);
      this.socket!.sendMessage(serializedPacket);

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
      return () => {};
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize({
      ...packet,
      pattern,
    });
    return this.socket!.sendMessage(serializedPacket);
  }
}
