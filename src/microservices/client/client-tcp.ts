import * as net from 'net';
import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
import { Logger } from '@nestjs/common';
import {
  TCP_DEFAULT_PORT,
  TCP_DEFAULT_HOST,
  CONNECT_EVENT,
  MESSAGE_EVENT,
  ERROR_EVENT,
  CLOSE_EVENT,
} from './../constants';

export class ClientTCP extends ClientProxy {
  private readonly logger = new Logger(ClientTCP.name);
  private readonly port: number;
  private readonly host: string;
  private isConnected = false;
  private socket: JsonSocket;

  constructor({ port, host }: ClientMetadata) {
    super();
    this.port = port || TCP_DEFAULT_PORT;
    this.host = host || TCP_DEFAULT_HOST;
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

  protected async sendSingleMessage(msg, callback: (...args) => any) {
    const self = this;
    const sendMessage = (socket: JsonSocket) => {
      socket.sendMessage(msg);
      socket.on(MESSAGE_EVENT, function(buffer) {
        self.handleResponse(socket, callback, buffer, this);
      });
    };
    if (this.isConnected) {
      sendMessage(this.socket);
      return Promise.resolve();
    }
    const socket = await this.init(callback);
    sendMessage(socket);
  }

  public handleResponse(
    socket: JsonSocket,
    callback: (...args) => any,
    buffer: any,
    context: Function,
  ) {
    const { err, response, disposed } = buffer;
    if (disposed) {
      callback(null, null, true);
      return socket._socket.removeListener(MESSAGE_EVENT, context);
    }
    callback(err, response);
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
