import * as net from 'net';
import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import {
  ClientOptions,
  TcpClientOptions,
} from '../interfaces/client-metadata.interface';
import { Logger } from '@nestjs/common';
import {
  TCP_DEFAULT_PORT,
  TCP_DEFAULT_HOST,
  CONNECT_EVENT,
  MESSAGE_EVENT,
  ERROR_EVENT,
  CLOSE_EVENT,
} from './../constants';
import { WritePacket, ReadPacket, PacketId } from './../interfaces';

export class ClientTCP extends ClientProxy {
  private readonly logger = new Logger(ClientTCP.name);
  private readonly port: number;
  private readonly host: string;
  private isConnected = false;
  private socket: JsonSocket;

  constructor(options: ClientOptions) {
    super();
    this.port =
      this.getOptionsProp<TcpClientOptions>(options, 'port') ||
      TCP_DEFAULT_PORT;
    this.host =
      this.getOptionsProp<TcpClientOptions>(options, 'host') ||
      TCP_DEFAULT_HOST;
  }

  public init(callback: (...args) => any): Promise<JsonSocket> {
    this.socket = this.createSocket();
    return new Promise(resolve => {
      this.bindEvents(this.socket, callback);
      this.socket._socket.once(CONNECT_EVENT, () => {
        this.isConnected = true;
        resolve(this.socket);
      });
      this.socket.connect(this.port, this.host);
    });
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    const handleRequestResponse = (jsonSocket: JsonSocket) => {
      const packet = this.assignPacketId(partialPacket);
      jsonSocket.sendMessage(packet);
      const listener = (buffer: WritePacket & PacketId) => {
        if (buffer.id !== packet.id) {
          return undefined;
        }
        this.handleResponse(jsonSocket, callback, buffer, listener);
      };
      jsonSocket.on(MESSAGE_EVENT, listener);
    };
    if (this.isConnected) {
      return handleRequestResponse(this.socket);
    }
    const socket = await this.init(callback);
    handleRequestResponse(socket);
    return;
  }

  public handleResponse(
    socket: JsonSocket,
    callback: (packet: WritePacket) => any,
    buffer: WritePacket,
    context: Function,
  ) {
    const { err, response, isDisposed } = buffer;
    if (isDisposed || err) {
      callback({
        err,
        response: null,
        isDisposed: true,
      });
      return socket._socket.removeListener(MESSAGE_EVENT, context);
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

  public bindEvents(socket: JsonSocket, callback: (...args) => any) {
    socket.on(ERROR_EVENT, err => this.handleError(err, callback));
    socket.on(CLOSE_EVENT, () => this.handleClose());
  }

  public handleError(err: any, callback: (...args) => any) {
    if (err.code === 'ECONNREFUSED') {
      callback(err, null);
    }
    this.logger.error(err);
  }

  public handleClose() {
    this.isConnected = false;
    this.socket = null;
  }
}
