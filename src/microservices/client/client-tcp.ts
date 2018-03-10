import * as net from 'net';
import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
import { Logger } from '@nestjs/common';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
const CLOSE_EVENT = 'close';

export class ClientTCP extends ClientProxy {
  private readonly logger = new Logger(ClientTCP.name);
  private readonly port: number;
  private readonly host: string;
  private isConnected = false;
  private socket;

  constructor({ port, host }: ClientMetadata) {
    super();
    this.port = port || DEFAULT_PORT;
    this.host = host || DEFAULT_HOST;
  }

  public init(callback: (...args) => any): Promise<{}> {
    this.socket = this.createSocket();

    return new Promise(resolve => {
      this.bindEvents(this.socket, callback);
      this.socket.on(CONNECT_EVENT, () => {
        this.isConnected = true;
        resolve(this.socket);
      });
      this.socket.connect(this.port, this.host);
    });
  }

  protected async sendSingleMessage(msg, callback: (...args) => any) {
    const sendMessage = socket => {
      socket.sendMessage(msg);
      socket.on(MESSAGE_EVENT, buffer =>
        this.handleResponse(socket, callback, buffer),
      );
    };
    if (this.isConnected) {
      sendMessage(this.socket);
      return Promise.resolve();
    }
    const socket = await this.init(callback);
    sendMessage(socket);
  }

  public handleResponse(socket, callback: (...args) => any, buffer) {
    const { err, response, disposed } = buffer;
    if (disposed || err) {
      callback(err, null, true);
      return socket.end();
    }
    callback(err, response);
  }

  public createSocket() {
    return new JsonSocket(new net.Socket());
  }

  public close() {
    this.socket && this.socket.end();
    this.isConnected = false;
    this.socket = null;
  }

  public bindEvents(socket, callback: (...args) => any) {
    socket.on(ERROR_EVENT, err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
      }
      this.logger.error(err);
    });
    socket.on(CLOSE_EVENT, () => {
      this.isConnected = false;
      this.socket = null;
    });
  }
}
