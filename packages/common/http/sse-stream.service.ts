import { Transform } from 'stream';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { MessageEvent } from '../interfaces';

function toDataString(data: string | object): string {
  if (typeof data === 'object') return toDataString(JSON.stringify(data));
  return data
    .split(/\r\n|\r|\n/)
    .map(line => `data: ${line}\n`)
    .join('');
}

interface WriteHeaders {
  writeHead?(statusCode: number, headers?: OutgoingHttpHeaders): WriteHeaders;
  flushHeaders?(): void;
}

export type HeaderStream = NodeJS.WritableStream & WriteHeaders;

/**
 * Adapted from https://raw.githubusercontent.com/EventSource/node-ssestream
 * Transforms "messages" to W3C event stream content.
 * See https://html.spec.whatwg.org/multipage/server-sent-events.html
 * A message is an object with one or more of the following properties:
 * - data (String or object, which gets turned into JSON)
 * - type
 * - id
 * - retry
 *
 * If constructed with a HTTP Request, it will optimise the socket for streaming.
 * If this stream is piped to an HTTP Response, it will set appropriate headers.
 */
export class SseStream extends Transform {
  private lastEventId: number = null;

  constructor(req?: IncomingMessage) {
    super({ objectMode: true });
    if (req) {
      req.socket.setKeepAlive(true);
      req.socket.setNoDelay(true);
      req.socket.setTimeout(0);
    }
  }

  pipe<T extends HeaderStream>(destination: T, options?: { end?: boolean }): T {
    if (destination.writeHead) {
      destination.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Transfer-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      destination.flushHeaders();
    }

    destination.write(':ok\n');
    return super.pipe(destination, options);
  }

  _transform(
    message: MessageEvent,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void,
  ) {
    if (message.type) this.push(`event: ${message.type}\n`);
    if (message.id) this.push(`id: ${message.id}\n`);
    if (message.retry) this.push(`retry: ${message.retry}\n`);
    if (message.data) this.push(toDataString(message.data));
    this.push('\n');
    callback();
  }

  writeMessage(
    message: MessageEvent,
    encoding?: string,
    cb?: (error: Error | null | undefined) => void,
  ): boolean {
    if (!message.id) {
      this.lastEventId = this.lastEventId === null ? 0 : this.lastEventId + 1;
      message.id = '' + this.lastEventId;
    }

    if (!message.type) {
      message.type = 'message';
    }

    return this.write(message, encoding, cb);
  }
}
