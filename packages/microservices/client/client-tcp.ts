import { Logger } from '@nestjs/common';
import * as JsonSocket from 'json-socket';
import * as net from 'net';
import { share, tap } from 'rxjs/operators';
import {
  CLOSE_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '../constants';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import {
  ClientOptions,
  TcpClientOptions,
} from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { ECONNREFUSED } from './constants';

export class ClientTCP extends ClientProxy {
  protected connection: Promise<any>;
  private readonly logger = new Logger(ClientTCP.name);
  private readonly port: number;
  private readonly host: string;
  private isConnected = false;
  private socket: JsonSocket;

  constructor(options: ClientOptions['options']) {
    super();
    this.port =
      this.getOptionsProp<TcpClientOptions>(options, 'port') ||
      TCP_DEFAULT_PORT;
    this.host =
      this.getOptionsProp<TcpClientOptions>(options, 'host') ||
      TCP_DEFAULT_HOST;
  }

  public connect(): Promise<any> {
    if (this.isConnected && this.connection) {
      return this.connection;
    }
    this.socket = this.createSocket();
    this.bindEvents(this.socket);

    const source$ = this.connect$(this.socket._socket).pipe(
      tap(() => {
        this.isConnected = true;
        this.socket.on(MESSAGE_EVENT, (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer),
        );
      }),
      share(),
    );

    this.socket.connect(this.port, this.host);
    this.connection = source$.toPromise();
    return this.connection;
  }

  public handleResponse(buffer: WritePacket & PacketId): void {
    const { err, response, isDisposed, id } = buffer;
    const callback = this.routingMap.get(id);
    if (!callback) {
      return undefined;
    }
    if (isDisposed || err) {
      callback({
        err,
        response: null,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  public createSocket(): JsonSocket {
    return new JsonSocket(new net.Socket());
  }

  public close() {
    this.socket && this.socket.end();
    this.handleClose();
  }

  public bindEvents(socket: JsonSocket) {
    socket.on(
      ERROR_EVENT,
      (err: any) => err.code !== ECONNREFUSED && this.handleError(err),
    );
    socket.on(CLOSE_EVENT, () => this.handleClose());
  }

  public handleError(err: any) {
    this.logger.error(err);
  }

  public handleClose() {
    this.isConnected = false;
    this.socket = null;
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);

      this.routingMap.set(packet.id, callback);
      this.socket.sendMessage(packet);

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    return this.socket.sendMessage({
      ...packet,
      pattern: this.normalizePattern(packet.pattern),
    });
  }
}
