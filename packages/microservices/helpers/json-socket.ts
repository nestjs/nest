import { Buffer } from 'buffer';
import { StringDecoder } from 'string_decoder';
import { CorruptedPacketLengthException } from '../errors/corrupted-packet-length.exception.js';
import { DrainTimeoutException } from '../errors/drain-timeout.exception.js';
import { IncompleteMessageTimeoutException } from '../errors/incomplete-message-timeout.exception.js';
import { MaxPacketLengthExceededException } from '../errors/max-packet-length-exceeded.exception.js';
import { MaxSendBufferSizeExceededException } from '../errors/max-send-buffer-size-exceeded.exception.js';
import { MessageReceiveTimeoutException } from '../errors/message-receive-timeout.exception.js';
import { TcpEventsMap } from '../events/tcp.events.js';
import { TcpSocket } from './tcp-socket.js';

const DEFAULT_MAX_BUFFER_SIZE = 128 * 1024 * 1024; // in characters, 128 to 256 MBs as a string takes 1 or 2 bytes per character
const DEFAULT_INCOMPLETE_MESSAGE_TIMEOUT = 30_000;
const DEFAULT_MESSAGE_RECEIVE_TIMEOUT = 300_000;
const DEFAULT_MAX_SEND_BUFFER_SIZE = 128 * 1024 * 1024; // 128 MBs in bytes
const DEFAULT_DRAIN_TIMEOUT = 30_000;
const MAX_CONTENT_LENGTH_SIZE = 32; // in characters, a string length never has more than 16 digits

export interface JsonSocketOptions {
  maxBufferSize?: number;
  incompleteMessageTimeout?: number;
  messageReceiveTimeout?: number;
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
  private readonly messageReceiveTimeout: number;
  private readonly maxSendBufferSize: number;
  private readonly drainTimeout: number;
  private readonly pauseOnBackpressure: boolean;
  private incompleteMessageTimer: NodeJS.Timeout | null = null;
  private messageReceiveDeadline: number | null = null;
  private drainTimer: NodeJS.Timeout | null = null;
  private isBackpressured = false;
  private backpressuredAt: number | null = null;
  private writtenLength = 0;

  constructor(socket: any, options?: JsonSocketOptions) {
    super(socket);
    this.maxBufferSize = options?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
    this.incompleteMessageTimeout =
      options?.incompleteMessageTimeout ?? DEFAULT_INCOMPLETE_MESSAGE_TIMEOUT;
    this.messageReceiveTimeout =
      options?.messageReceiveTimeout ?? DEFAULT_MESSAGE_RECEIVE_TIMEOUT;
    this.maxSendBufferSize =
      options?.maxSendBufferSize ?? DEFAULT_MAX_SEND_BUFFER_SIZE;
    this.drainTimeout = options?.drainTimeout ?? DEFAULT_DRAIN_TIMEOUT;
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
    const data = Buffer.isBuffer(dataRaw)
      ? this.stringDecoder.write(dataRaw)
      : dataRaw;
    this.buffer += data;

    try {
      this.processBuffer();
    } finally {
      this.refreshIncompleteMessageTimer();
    }
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
        const contentLength = parseInt(rawContentLength, 10);

        if (isNaN(contentLength) || contentLength < 0) {
          this.buffer = '';
          throw new CorruptedPacketLengthException(rawContentLength);
        }
        // A packet declaring more than the buffer may hold can never be
        // accepted, so there is no point in buffering any of it. Whatever
        // the peer sends next is the rest of that packet, so stop reading.
        if (contentLength > this.maxBufferSize) {
          this.buffer = '';
          this.handleDataError(
            new MaxPacketLengthExceededException(contentLength),
            { destroy: true },
          );
          return;
        }
        this.contentLength = contentLength;
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

  private applyBackpressure() {
    if (this.isBackpressured) {
      return;
    }
    this.isBackpressured = true;
    this.backpressuredAt = Date.now();
    // Reads are paused by us, so the peer cannot make progress on an inbound
    // packet. Resume its timeouts only after outgoing data has drained.
    this.clearIncompleteMessageTimer();
    this.socket.pause();
    this.socket.once(TcpEventsMap.DRAIN, () => this.releaseBackpressure());
    this.armDrainTimer();
  }

  private releaseBackpressure() {
    this.isBackpressured = false;
    // The time spent paused is not counted against the peer
    if (this.messageReceiveDeadline !== null && this.backpressuredAt !== null) {
      this.messageReceiveDeadline += Date.now() - this.backpressuredAt;
    }
    this.backpressuredAt = null;
    this.clearDrainTimer();
    this.socket.resume();

    // Frames that arrived before the socket was paused may still be buffered.
    try {
      this.processBuffer();
    } catch (e) {
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
   * Arms a timer whenever a packet is only partially received, and disarms
   * it as soon as the buffer is drained. It fires on whichever comes first:
   * - the peer staying silent mid-packet for "incompleteMessageTimeout", as
   *   the timer is refreshed on every read,
   * - the packet not being complete "messageReceiveTimeout" after it began,
   *   which no amount of reads extends. Otherwise, a peer sending a byte now
   *   and then would pin a partial packet in memory indefinitely.
   */
  private refreshIncompleteMessageTimer() {
    this.clearIncompleteMessageTimer();

    const hasIncompleteMessage =
      this.buffer.length > 0 || this.contentLength !== null;
    if (!hasIncompleteMessage) {
      this.messageReceiveDeadline = null;
      return;
    }
    if (this.isBackpressured) {
      return;
    }
    if (this.messageReceiveTimeout && this.messageReceiveDeadline === null) {
      this.messageReceiveDeadline = Date.now() + this.messageReceiveTimeout;
    }

    const idleTimeout = this.incompleteMessageTimeout || Infinity;
    const remainingTime =
      this.messageReceiveDeadline === null
        ? Infinity
        : Math.max(this.messageReceiveDeadline - Date.now(), 0);
    if (idleTimeout === Infinity && remainingTime === Infinity) {
      return;
    }

    const isDeadlineFirst = remainingTime <= idleTimeout;
    this.incompleteMessageTimer = setTimeout(
      () =>
        isDeadlineFirst
          ? this.handleMessageReceiveTimeout()
          : this.handleIncompleteMessageTimeout(),
      Math.min(idleTimeout, remainingTime),
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
    const bufferedLength = this.discardIncompleteMessage();

    // The peer already stopped talking mid-packet, so do not wait on a FIN.
    this.handleDataError(
      new IncompleteMessageTimeoutException(
        bufferedLength,
        this.incompleteMessageTimeout,
      ),
      { destroy: true },
    );
  }

  private handleMessageReceiveTimeout() {
    const bufferedLength = this.discardIncompleteMessage();

    // A FIN would only queue up behind the rest of the packet the peer is
    // still trickling in.
    this.handleDataError(
      new MessageReceiveTimeoutException(
        bufferedLength,
        this.messageReceiveTimeout,
      ),
      { destroy: true },
    );
  }

  private discardIncompleteMessage() {
    const bufferedLength = this.buffer.length;
    this.buffer = '';
    this.contentLength = null;
    this.messageReceiveDeadline = null;
    this.incompleteMessageTimer = null;
    return bufferedLength;
  }

  private handleMessage(message: any) {
    this.contentLength = null;
    this.messageReceiveDeadline = null;
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
