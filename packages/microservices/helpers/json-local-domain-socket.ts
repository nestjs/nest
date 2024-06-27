import { Buffer } from 'buffer';
import { StringDecoder } from 'string_decoder';
import { CorruptedPacketLengthException } from '../errors/corrupted-packet-length.exception';
import { LocalDomainSocket } from './local-domain-socket';

export class JsonLocalDomainSocket extends LocalDomainSocket {
  private contentLength: number | null = null;
  private buffer = '';

  private readonly stringDecoder = new StringDecoder();
  private readonly delimiter = '#';

  protected handleSend(message: any, callback?: (err?: any) => void) {
    this.socket.write(this.formatMessageData(message), 'utf-8', callback);
  }

  protected handleData(dataRaw: Buffer | string) {
    const data = Buffer.isBuffer(dataRaw)
      ? this.stringDecoder.write(dataRaw)
      : dataRaw;
    this.buffer += data;

    if (this.contentLength == null) {
      const i = this.buffer.indexOf(this.delimiter);
      /**
       * Check if the buffer has the delimiter (#),
       * if not, the end of the buffer string might be in the middle of a content length string
       */
      if (i !== -1) {
        const rawContentLength = this.buffer.substring(0, i);
        this.contentLength = parseInt(rawContentLength, 10);

        if (isNaN(this.contentLength)) {
          this.contentLength = null;
          this.buffer = '';
          throw new CorruptedPacketLengthException(rawContentLength);
        }
        this.buffer = this.buffer.substring(i + 1);
      }
    }

    if (this.contentLength !== null) {
      const length = this.buffer.length;
      if (length === this.contentLength) {
        this.handleMessage(this.buffer);
      } else if (length > this.contentLength) {
        const message = this.buffer.substring(0, this.contentLength);
        const rest = this.buffer.substring(this.contentLength);
        this.handleMessage(message);
        this.handleData(rest);
      }
    }
  }

  private handleMessage(message: any) {
    this.contentLength = null;
    this.buffer = '';
    this.emitMessage(message);
  }

  private formatMessageData(message: any) {
    const messageData = JSON.stringify(message);
    const length = messageData.length;
    const data = length + this.delimiter + messageData;
    return data;
  }
}
