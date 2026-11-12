import { Buffer } from 'buffer';
import { StringDecoder } from 'string_decoder';
import { CorruptedPacketLengthException } from '../errors/corrupted-packet-length.exception';
import { DrainTimeoutException } from '../errors/drain-timeout.exception';
import { IncompleteMessageTimeoutException } from '../errors/incomplete-message-timeout.exception';
import { MaxPacketLengthExceededException } from '../errors/max-packet-length-exceeded.exception';
import { MaxSendBufferSizeExceededException } from '../errors/max-send-buffer-size-exceeded.exception';
import { TcpEventsMap } from '../events/tcp.events';
import { TcpSocket } from './tcp-socket';

// In characters, which a string holds in 1 or 2 bytes each. A complete packet
// is parsed in one go, and the value parsed can take far more memory than its
// text, e.g. about 40 bytes per character for '[{"a":0},{"a":0},...]'. 16Mi
// matches what KafkaParser accepts for a Kafka message.
const DEFAULT_MAX_BUFFER_SIZE = 16 * 1024 * 1024;
const DEFAULT_INCOMPLETE_MESSAGE_TIMEOUT = 30_000;
const DEFAULT_MAX_SEND_BUFFER_SIZE = 128 * 1024 * 1024; // 128 MBs in bytes
const DEFAULT_DRAIN_TIMEOUT = 30_000;
const MAX_CONTENT_LENGTH_SIZE = 32; // in characters, a string length never has more than 16 digits
// An upper bound on what a string takes for each read appended to it, besides
// its characters, and how many reads are appended before it is flattened
const APPENDED_READ_OVERHEAD = 64; // in bytes
const MIN_READS_BEFORE_FLATTENING = 1024;

/**
 * A limit that is missing, or that is not a number (e.g. NaN from
 * "Number(process.env.UNSET)", or '16mb'), gets its default. Every check on
 * a limit is a comparison or a truthiness test, and none of them trips for
 * NaN, so keeping it would turn the limit off.
 */
function resolveLimit(value: number | undefined, defaultValue: number) {
  return value == null || isNaN(value) ? defaultValue : value;
}

export interface JsonSocketOptions {
  maxBufferSize?: number;
  incompleteMessageTimeout?: number;
  maxSendBufferSize?: number;
  drainTimeout?: number;
  pauseOnBackpressure?: boolean;
}

export class JsonSocket extends TcpSocket {
  private contentLength: number | null = null;
  private buffer = '';

  private readonly stringDecoder = new StringDecoder();
  private readonly delimiter = '#';
  private readonly maxBufferSize: number;
  private readonly incompleteMessageTimeout: number;
  private readonly maxSendBufferSize: number;
  private readonly drainTimeout: number;
  private readonly pauseOnBackpressure: boolean;
  private incompleteMessageTimer: NodeJS.Timeout | null = null;
  private drainTimer: NodeJS.Timeout | null = null;
  private isBackpressured = false;
  private writtenLength = 0;
  /**
   * Set once the data received could not be framed. Whatever the peer sends
   * after that can no longer be split into packets reliably.
   */
  private hasFramingError = false;
  private readsSinceFlattened = 0;

  constructor(socket: any, options?: JsonSocketOptions) {
    super(socket);
    this.maxBufferSize = resolveLimit(
      options?.maxBufferSize,
      DEFAULT_MAX_BUFFER_SIZE,
    );
    this.incompleteMessageTimeout = resolveLimit(
      options?.incompleteMessageTimeout,
      DEFAULT_INCOMPLETE_MESSAGE_TIMEOUT,
    );
    this.maxSendBufferSize = resolveLimit(
      options?.maxSendBufferSize,
      DEFAULT_MAX_SEND_BUFFER_SIZE,
    );
    this.drainTimeout = resolveLimit(
      options?.drainTimeout,
      DEFAULT_DRAIN_TIMEOUT,
    );
    this.pauseOnBackpressure = options?.pauseOnBackpressure ?? true;

    this.socket.on(TcpEventsMap.CLOSE, () => {
      this.clearIncompleteMessageTimer();
      this.clearDrainTimer();
    });
  }

  protected handleSend(message: any, callback?: (err?: any) => void) {
    const data = this.formatMessageData(message);
    const flushed = this.socket.write(data, 'utf-8', callback);
    this.writtenLength += data.length;

    // "write" returns false once the outgoing buffer is above the socket's
    // high-water mark. Without honouring it, a peer that issues requests but
    // never reads the responses makes the process buffer every response in
    // memory. Reading is suspended until the peer catches up, which also stops
    // further requests from that peer being turned into more queued responses.
    if (flushed === false && this.pauseOnBackpressure) {
      this.applyBackpressure();
    }
    this.assertSendBufferWithinLimit();
  }

  /**
   * Suspending reads bounds a peer that keeps asking for more, but responses
   * to requests already in flight still queue up behind a peer that reads
   * nothing at all. This caps how much may be held for one connection, which
   * mirrors "maxBufferSize" on the receiving side.
   */
  private assertSendBufferWithinLimit() {
    const bufferedBytes = this.socket.writableLength;
    if (!this.maxSendBufferSize || !(bufferedBytes > this.maxSendBufferSize)) {
      return;
    }
    this.handleDataError(
      new MaxSendBufferSizeExceededException(
        bufferedBytes,
        this.maxSendBufferSize,
      ),
      { destroy: true },
    );
  }

  protected handleData(dataRaw: Buffer | string) {
    if (this.hasFramingError) {
      return;
    }
    const data = Buffer.isBuffer(dataRaw)
      ? this.stringDecoder.write(dataRaw)
      : dataRaw;
    this.buffer += data;
    this.readsSinceFlattened++;

    try {
      this.processBuffer();
      this.flattenBufferIfFragmented();
    } catch (err) {
      this.discardAfterFramingError();
      throw err;
    } finally {
      this.refreshIncompleteMessageTimer();
    }
  }

  /**
   * Appending to a string does not copy it: the engine keeps each appended
   * read as a piece of its own, at up to 32 bytes or so on top of its
   * characters, until the string is read. Nothing reads the buffer while the
   * rest of a packet is awaited, so a packet arriving a few bytes per read
   * would take many times the 1 or 2 bytes per character "maxBufferSize"
   * stands for. Once the reads may weigh as much as the characters, the
   * buffer is copied into a single string. Each copy is paid for by the reads
   * since the previous one, and reads of an ordinary size never cause one.
   */
  private flattenBufferIfFragmented() {
    if (
      this.readsSinceFlattened < MIN_READS_BEFORE_FLATTENING ||
      this.readsSinceFlattened * APPENDED_READ_OVERHEAD < this.buffer.length
    ) {
      return;
    }
    this.readsSinceFlattened = 0;
    if (this.buffer.length > 0) {
      // Unlike UTF-8, UTF-16 also keeps a surrogate whose other half has not
      // been read yet
      this.buffer = Buffer.from(this.buffer, 'utf16le').toString('utf16le');
    }
  }

  /**
   * The socket is ended after a framing error, but the peer may keep sending
   * until it closes. Parsing that from wherever the failed packet left off
   * could turn an arbitrary part of it into a message, so it is ignored.
   */
  private discardAfterFramingError() {
    this.hasFramingError = true;
    this.buffer = '';
    this.contentLength = null;
  }

  private processBuffer() {
    // Iterative loop replaces recursion to prevent stack overflow on pipelined
    // TCP messages (e.g. many small frames arriving in one read event).
    while (true) {
      // Stop turning buffered frames into responses while the outgoing buffer
      // is backed up. Whatever is left stays in the buffer and is picked up
      // again once the socket drains.
      if (this.isBackpressured) {
        break;
      }

      // A read may hold several packets, or the end of one and the start of
      // the next. They are taken off the buffer one at a time below, so only
      // the packet at its start has to be within the limit.
      if (
        this.buffer.length > this.maxBufferSize &&
        !this.startsWithPacketWithinLimit()
      ) {
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
          // Data that cannot be a content length would otherwise be kept and
          // scanned again on every read until a delimiter arrives
          if (this.buffer.length > MAX_CONTENT_LENGTH_SIZE) {
            const rawContentLength = this.buffer.substring(
              0,
              MAX_CONTENT_LENGTH_SIZE,
            );
            this.buffer = '';
            throw new CorruptedPacketLengthException(rawContentLength);
          }
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

  /**
   * Whether the buffer starts with a packet that "maxBufferSize" allows: one
   * whose header, read already or not, declares a length within the limit.
   * Such a packet is either complete, and taken off the buffer right away,
   * or keeps the buffer within the limit plus one read.
   */
  private startsWithPacketWithinLimit(): boolean {
    if (this.contentLength !== null) {
      return (
        this.contentLength >= 0 && this.contentLength <= this.maxBufferSize
      );
    }
    const header = this.buffer.substring(0, MAX_CONTENT_LENGTH_SIZE + 1);
    const i = header.indexOf(this.delimiter);
    if (i === -1) {
      return false;
    }
    const contentLength = parseInt(header.substring(0, i), 10);
    return contentLength >= 0 && contentLength <= this.maxBufferSize;
  }

  private applyBackpressure() {
    if (this.isBackpressured) {
      return;
    }
    this.isBackpressured = true;
    this.socket.pause();
    this.socket.once(TcpEventsMap.DRAIN, () => this.releaseBackpressure());
    this.armDrainTimer();
  }

  private releaseBackpressure() {
    this.isBackpressured = false;
    this.clearDrainTimer();
    this.socket.resume();

    // Frames that arrived before the socket was paused may still be buffered.
    try {
      this.processBuffer();
    } catch (e) {
      this.discardAfterFramingError();
      this.handleDataError(e);
    } finally {
      this.refreshIncompleteMessageTimer();
    }
  }

  /**
   * Arms a timer while reads are suspended, as only the peer, by reading,
   * can bring about the "drain" that resumes them. Whenever it fires, it is
   * armed again if some of the queued data has been written out since, so
   * it only drops a peer once nothing at all has been written out for a
   * full period - a slow but reading peer is given more time.
   */
  private armDrainTimer() {
    if (!this.drainTimeout) {
      return;
    }
    const drainedLength = this.getDrainedLength();
    this.drainTimer = setTimeout(
      () => this.handleDrainTimeout(drainedLength),
      this.drainTimeout,
    );
    this.drainTimer.unref?.();
  }

  private clearDrainTimer() {
    if (!this.drainTimer) {
      return;
    }
    clearTimeout(this.drainTimer);
    this.drainTimer = null;
  }

  private handleDrainTimeout(drainedLength: number) {
    this.drainTimer = null;
    if (this.getDrainedLength() > drainedLength) {
      this.armDrainTimer();
      return;
    }

    // A FIN would only queue up behind the responses the peer is not reading.
    this.handleDataError(
      new DrainTimeoutException(this.socket.writableLength, this.drainTimeout),
      { destroy: true },
    );
  }

  /**
   * How much of the data written so far has left the outgoing buffer. Unlike
   * "writableLength", it does not move when more responses are queued, only
   * when a pending write completes, which is as fine-grained as Node reports
   * progress. Sockets do not decode strings, so "writableLength" counts them
   * by length, as "writtenLength" does.
   */
  private getDrainedLength() {
    return this.writtenLength - this.socket.writableLength;
  }

  /**
   * Arms an idle timer whenever a packet is only partially received, and
   * disarms it as soon as the buffer is drained. The timer is refreshed on
   * every read, so it only fires when the peer stops sending mid-packet -
   * a slow but progressing transfer is never interrupted.
   */
  private refreshIncompleteMessageTimer() {
    this.clearIncompleteMessageTimer();

    const hasIncompleteMessage =
      this.buffer.length > 0 || this.contentLength !== null;
    if (!this.incompleteMessageTimeout || !hasIncompleteMessage) {
      return;
    }

    this.incompleteMessageTimer = setTimeout(
      () => this.handleIncompleteMessageTimeout(),
      this.incompleteMessageTimeout,
    );
    this.incompleteMessageTimer.unref?.();
  }

  private clearIncompleteMessageTimer() {
    if (!this.incompleteMessageTimer) {
      return;
    }
    clearTimeout(this.incompleteMessageTimer);
    this.incompleteMessageTimer = null;
  }

  private handleIncompleteMessageTimeout() {
    const bufferedLength = this.buffer.length;
    this.buffer = '';
    this.contentLength = null;
    this.incompleteMessageTimer = null;

    // The peer already stopped talking mid-packet, so do not wait on a FIN.
    this.handleDataError(
      new IncompleteMessageTimeoutException(
        bufferedLength,
        this.incompleteMessageTimeout,
      ),
      { destroy: true },
    );
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
