import { Logger } from '@nestjs/common';
import * as JsonSocket from 'json-socket';
import * as net from 'net';
import { tap } from 'rxjs/operators';
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
    if (this.isConnected) {
      return Promise.resolve();
    }
    this.socket = this.createSocket();
    return new Promise((resolve, reject) => {
      this.bindEvents(this.socket);
      this.connect$(this.socket._socket)
        .pipe(tap(() => (this.isConnected = true)))
        .subscribe(resolve, reject);

      this.socket.connect(this.port, this.host);
    });
  }

  public handleResponse(
    callback: (packet: WritePacket) => any,
    buffer: WritePacket,
  ) {
    const { err, response, isDisposed } = buffer;
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
      err => err.code !== ECONNREFUSED && this.handleError(err),
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
      const listener = (buffer: WritePacket & PacketId) => {
        if (buffer.id !== packet.id) {
          return undefined;
        }
        this.handleResponse(callback, buffer);
      };
      this.socket.on(MESSAGE_EVENT, listener);
      this.socket.sendMessage(packet);

      return () => this.socket._socket.removeListener(MESSAGE_EVENT, listener);
    } catch (err) {
      callback({ err });
    }
  }
}
