import { Buffer } from 'buffer';
import { StringDecoder } from 'string_decoder';
import { CorruptedPacketLengthException } from '../errors/corrupted-packet-length.exception';
import { MaxPacketLengthExceededException } from '../errors/max-packet-length-exceeded.exception';
import { TcpSocket } from './tcp-socket';

const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4; // 512 MBs in characters with 4 bytes per character (32-bit)

export interface JsonSocketOptions {
  maxBufferSize?: number;
}

export class JsonSocket extends TcpSocket {
  private contentLength: number | null = null;
  private buffer = '';

  private readonly stringDecoder = new StringDecoder();
  private readonly delimiter = '#';
  private readonly maxBufferSize: number;

  constructor(socket: any, options?: JsonSocketOptions) {
    super(socket);
    this.maxBufferSize = options?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
  }

  protected handleSend(message: any, callback?: (err?: any) => void) {
    this.socket.write(this.formatMessageData(message), 'utf-8', callback);
  }

  protected handleData(dataRaw: Buffer | string) {
    const data = Buffer.isBuffer(dataRaw)
      ? this.stringDecoder.write(dataRaw)
      : dataRaw;
    this.buffer += data;

    // Iterative loop replaces recursion to prevent stack overflow on pipelined
    // TCP messages (e.g. many small frames arriving in one read event).
    while (true) {
      if (this.buffer.length > this.maxBufferSize) {
        const bufferLength = this.buffer.length;
        this.buffer = '';
        throw new MaxPacketLengthExceededException(bufferLength);
      }

      if (this.contentLength === null) {
        const i = this.buffer.indexOf(this.delimiter);
        /**
         * Check if the buffer has the delimiter (#),
         * if not, the end of the buffer string might be in the middle of a content length string
         */
        if (i === -1) {
          break;
        }
        const rawContentLength = this.buffer.substring(0, i);
        this.contentLength = parseInt(rawContentLength, 10);

        if (isNaN(this.contentLength)) {
          this.contentLength = null;
          this.buffer = '';
          throw new CorruptedPacketLengthException(rawContentLength);
        }
        this.buffer = this.buffer.substring(i + 1);
      }

      if (this.contentLength !== null) {
        const length = this.buffer.length;
        if (length === this.contentLength) {
          this.handleMessage(this.buffer);
          // handleMessage resets contentLength and buffer; next iteration will break
        } else if (length > this.contentLength) {
          const message = this.buffer.substring(0, this.contentLength);
          const rest = this.buffer.substring(this.contentLength);
          this.handleMessage(message); // resets this.buffer to ''
          this.buffer = rest; // restore remaining data for next iteration
          continue;
        } else {
          // Incomplete message — wait for more data
          break;
        }
      } else {
        break;
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
