import { Logger, type Type } from '@nestjs/common';
import * as net from 'net';
import { EmptyError, lastValueFrom } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import { ConnectionOptions, connect as tlsConnect, TLSSocket } from 'tls';
import {
  ECONNREFUSED,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants.js';
import { TcpEvents, TcpEventsMap, TcpStatus } from '../events/tcp.events.js';
import { JsonSocket, TcpSocket } from '../helpers/index.js';
import { PacketId, ReadPacket, WritePacket } from '../interfaces/index.js';
import { TcpClientOptions } from '../interfaces/client-metadata.interface.js';
import { ClientProxy } from './client-proxy.js';

/**
 * @publicApi
 */
export class ClientTCP extends ClientProxy<TcpEvents, TcpStatus> {
  protected readonly logger = new Logger(ClientTCP.name);
  protected readonly port: number;
  protected readonly host: string;
  protected readonly socketClass: Type<TcpSocket>;
  protected readonly tlsOptions?: ConnectionOptions;
  protected readonly maxBufferSize?: number;
  protected readonly incompleteMessageTimeout?: number;
  protected readonly maxSendBufferSize?: number;
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
    this.maxBufferSize = this.getOptionsProp(options, 'maxBufferSize');
    this.incompleteMessageTimeout = this.getOptionsProp(
      options,
      'incompleteMessageTimeout',
    );
    this.maxSendBufferSize = this.getOptionsProp(options, 'maxSendBufferSize');

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public connect(): Promise<any> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    const socket = this.createSocket();
    this.socket = socket;
    this.registerConnectListener(socket);
    this.registerCloseListener(socket);
    this.registerErrorListener(socket);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      socket.on(event, callback as any),
    );
    this.pendingEventListeners = [];

    const source$ = this.connect$(socket.netSocket).pipe(
      tap(() => {
        // A socket replaced by a newer `connect()` call (`close()` followed by
        // `connect()` while it was still connecting) still finishes connecting,
        // so its listener must stay on it instead of `this.socket`.
        socket.on('message', (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer),
        );
      }),
      share(),
    );

    // For TLS connections, the connection is initiated when the socket is created
    if (!this.tlsOptions) {
      socket.connect(this.port, this.host);
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

  public close() {
    this.socket && this.socket.end();
    this.handleClose();
    this.pendingEventListeners = [];
  }

  public registerConnectListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.CONNECT, () => {
      if (this.isReplacedSocket(socket)) {
        return;
      }
      this._status$.next(TcpStatus.CONNECTED);
    });
  }

  public registerErrorListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.ERROR, err => {
      if (err.code !== ECONNREFUSED) {
        this.handleError(err);
      } else if (!this.isReplacedSocket(socket)) {
        this._status$.next(TcpStatus.DISCONNECTED);
      }
    });
  }

  public registerCloseListener(socket: TcpSocket) {
    socket.on(TcpEventsMap.CLOSE, () => {
      if (this.isReplacedSocket(socket)) {
        return;
      }
      this._status$.next(TcpStatus.DISCONNECTED);
      this.handleClose();
    });
  }

  /**
   * Whether a newer `connect()` call has replaced `socket` (e.g., `close()`
   * followed by `connect()` before it finished closing), so its late events
   * must not tear down or report on the newer connection.
   */
  private isReplacedSocket(socket: TcpSocket): boolean {
    return this.socket !== null && this.socket !== socket;
  }

  public handleError(err: any) {
    this.logger.error(err);
  }

  public handleClose() {
    this.socket = null;
    this.connectionPromise = null;

    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      const callbacks = [...this.routingMap.values()];
      this.routingMap.clear();

      for (const callback of callbacks) {
        try {
          callback({ err });
        } catch (callbackErr) {
          // A failing callback must not keep the remaining requests pending
          // nor prevent the connection from being closed.
          this.logger.error(callbackErr);
        }
      }
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
    let cleanup = () => {};
    try {
      const packet = this.assignPacketId(partialPacket);
      const serializedPacket = this.serializer.serialize(packet);

      this.routingMap.set(packet.id, callback);
      cleanup = () => this.routingMap.delete(packet.id);

      this.socket!.sendMessage(serializedPacket);

      return cleanup;
    } catch (err) {
      cleanup();
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
