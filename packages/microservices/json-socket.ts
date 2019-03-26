import { Socket } from 'net';
import { StringDecoder } from 'string_decoder';
import {
  CLOSE_EVENT,
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  DATA_EVENT,
} from './constants';

const stringDecoder = new StringDecoder();

export class JsonSocket {
  private contentLength: number | null = null;
  private buffer = '';
  private closed = false;

  private readonly delimeter = '#';

  public get netSocket() {
    return this.socket;
  }

  constructor(public readonly socket: Socket) {
    this.socket.on(DATA_EVENT, this.onData.bind(this));
    this.socket.on(CONNECT_EVENT, () => (this.closed = false));
    this.socket.on(CLOSE_EVENT, () => (this.closed = true));
    this.socket.on(ERROR_EVENT, () => (this.closed = true));
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
    if (this.closed) {
      if (callback) {
        callback(new Error('The net socket is closed.'));
      }
      return;
    }
    this.socket.write(this.formatMessageData(message), 'utf-8', callback);
  }

  private onData(dataRaw: Buffer | string) {
    const data = Buffer.isBuffer(dataRaw)
      ? stringDecoder.write(dataRaw)
      : dataRaw;

    try {
      this.handleData(data);
    } catch (e) {
      this.socket.emit(ERROR_EVENT, e.message);
      this.socket.end();
    }
  }

  private handleData(data: string) {
    this.buffer += data;

    if (this.contentLength == null) {
      const i = this.buffer.indexOf(this.delimeter);

      /**
       * Check if the buffer has the delimeter (#),
       * if not, the end of the buffer string might be in the middle of a content length string
       */
      if (i !== -1) {
        const rawContentLength = this.buffer.substring(0, i);
        this.contentLength = parseInt(rawContentLength, 10);

        if (isNaN(this.contentLength)) {
          this.contentLength = null;
          this.buffer = '';

          throw new Error(
            `Corrupted length value "${rawContentLength}" supplied in a packet`,
          );
        }

        this.buffer = this.buffer.substring(i + 1);
      }
    }

    if (this.contentLength != null) {
      const length = this.buffer.length;

      if (length === this.contentLength) {
        this.handleMessage(this.buffer);
      } else if (length > this.contentLength) {
        const message = this.buffer.substring(0, this.contentLength);
        const rest = this.buffer.substring(this.contentLength);
        this.handleMessage(message);
        this.onData(rest);
      }
    }
  }

  private handleMessage(data: string) {
    this.contentLength = null;
    this.buffer = '';
    let message: object;

    try {
      message = JSON.parse(data);
    } catch (e) {
      throw new Error(
        `Could not parse JSON: ${e.message}\nRequest data: ${data}`,
      );
    }
    message = message || {};

    this.socket.emit(MESSAGE_EVENT, message);
  }

  private formatMessageData(message: any) {
    const messageData = JSON.stringify(message);
    const length = messageData.length;
    const data = length + this.delimeter + messageData;
    return data;
  }
}
