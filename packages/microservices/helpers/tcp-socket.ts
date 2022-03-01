import { Buffer } from 'buffer';
import { Socket } from 'net';
import {
  CLOSE_EVENT,
  CONNECT_EVENT,
  DATA_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
} from '../constants';
import { NetSocketClosedException } from '../errors/net-socket-closed.exception';
import { InvalidJSONFormatException } from '../errors/invalid-json-format.exception';

export abstract class TcpSocket {
  private isClosed = false;

  public get netSocket() {
    return this.socket;
  }

  constructor(public readonly socket: Socket) {
    this.socket.on(DATA_EVENT, this.onData.bind(this));
    this.socket.on(CONNECT_EVENT, () => (this.isClosed = false));
    this.socket.on(CLOSE_EVENT, () => (this.isClosed = true));
    this.socket.on(ERROR_EVENT, () => (this.isClosed = true));
  }

  public connect(port: number, host: string) {
    this.socket.connect(port, host);
    return this;
  }

  public on(event: string, callback: (err?: any) => void) {
    this.socket.on(event, callback);
    return this;
  }

  public once(event: string, callback: (err?: any) => void) {
    this.socket.once(event, callback);
    return this;
  }

  public end() {
    this.socket.end();
    return this;
  }

  public sendMessage(message: any, callback?: (err?: any) => void) {
    if (this.isClosed) {
      callback && callback(new NetSocketClosedException());
      return;
    }
    this.handleSend(message, callback);
  }

  protected abstract handleSend(message: any, callback?: (err?: any) => void);

  private onData(data: Buffer) {
    try {
      this.handleData(data);
    } catch (e) {
      this.socket.emit(ERROR_EVENT, e.message);
      this.socket.end();
    }
  }

  protected abstract handleData(data: Buffer | string);

  protected emitMessage(data: string) {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(data);
    } catch (e) {
      throw new InvalidJSONFormatException(e, data);
    }
    message = message || {};
    this.socket.emit(MESSAGE_EVENT, message);
  }
}
