import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { Transform } from 'stream';
import type { MessageEvent } from '@nestjs/common';
import {
  isFunction,
  isNil,
  isObject,
  isUndefined,
} from '@nestjs/common/internal';

function serializeSseLines(value: string, prefix: string): string {
  return value
    .split(/\r\n|\r|\n/)
    .map(line => `${prefix}${line}\n`)
    .join('');
}

function toDataString(data: string | object): string {
  if (isObject(data)) {
    return toDataString(JSON.stringify(data));
  }

  return serializeSseLines(data, 'data: ');
}

function toCommentString(comment: string): string {
  return serializeSseLines(comment, ': ');
}

function omitHeaders(
  headers: AdditionalHeaders | undefined,
  names: string[],
): AdditionalHeaders {
  const omitted = new Set(names.map(name => name.toLowerCase()));
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => !omitted.has(name.toLowerCase()),
    ),
  );
}

function isCommentOnly(message: MessageEvent): boolean {
  return (
    !isNil(message.comment) &&
    isUndefined(message.data) &&
    isUndefined(message.type) &&
    isUndefined(message.retry)
  );
}

export type AdditionalHeaders = Record<
  string,
  string[] | string | number | undefined
>;

export type AdditionalHeadersSource =
  AdditionalHeaders | (() => AdditionalHeaders | undefined);

export type StatusCodeSource = number | (() => number | undefined);

interface ReadHeaders {
  getHeaders?(): AdditionalHeaders;
}

interface WriteHeaders {
  writableEnded?: boolean;
  statusCode?: number;
  writeHead?(
    statusCode: number,
    reasonPhrase?: string,
    headers?: OutgoingHttpHeaders,
  ): void;
  writeHead?(statusCode: number, headers?: OutgoingHttpHeaders): void;
  flushHeaders?(): void;
}

export type WritableHeaderStream = NodeJS.WritableStream & WriteHeaders;
export type HeaderStream = WritableHeaderStream & ReadHeaders;

/**
 * Adapted from https://raw.githubusercontent.com/EventSource/node-ssestream
 * Transforms "messages" to W3C event stream content.
 * See https://html.spec.whatwg.org/multipage/server-sent-events.html
 * A message is an object with one or more of the following properties:
 * - data (String or object, which gets turned into JSON)
 * - type
 * - id
 * - retry
 * - comment
 *
 * If constructed with a HTTP Request, it will optimise the socket for streaming.
 * If this stream is piped to an HTTP Response, it will set appropriate headers.
 */
export class SseStream extends Transform {
  private lastEventId: number | null = null;
  private _headersCommitted = false;
  private _destination: WritableHeaderStream | null = null;
  private _statusCode: StatusCodeSource | undefined;
  private _additionalHeaders: AdditionalHeadersSource | undefined;
  private readonly _isHttp2: boolean;

  constructor(req?: IncomingMessage) {
    super({ objectMode: true });
    this._isHttp2 = (req?.httpVersionMajor ?? 1) > 1;
    // Under HTTP/2 these calls are not request-scoped: `setTimeout` is routed
    // to the shared `Http2Session` and the rest to the shared TCP socket, so
    // tuning one SSE request would disable the idle timeout for every stream
    // on that connection. See https://nodejs.org/api/http2.html#requestsocket
    if (req && req.socket && !this._isHttp2) {
      req.socket.setKeepAlive(true);
      req.socket.setNoDelay(true);
      req.socket.setTimeout(0);
    }
  }

  get headersCommitted(): boolean {
    return this._headersCommitted;
  }

  pipe<T extends WritableHeaderStream>(
    destination: T,
    options?: {
      additionalHeaders?: AdditionalHeadersSource;
      statusCode?: StatusCodeSource;
      end?: boolean;
    },
  ): T {
    this._destination = destination;
    this._statusCode = options?.statusCode;
    this._additionalHeaders = options?.additionalHeaders;
    return super.pipe(destination, options);
  }

  /**
   * Writes SSE headers to the destination if they have not been sent yet.
   * The sources are read here, not in `pipe()`, to pick up the values that
   * interceptors and handlers set after piping.
   */
  commitHeaders(): void {
    if (
      this._headersCommitted ||
      !this._destination ||
      this._destination.writableEnded
    ) {
      return;
    }
    const statusCode = this.readStatusCode();
    const additionalHeaders = this.readAdditionalHeaders();
    this._headersCommitted = true;
    if (this._destination.writeHead) {
      const sseHeaders = {
        // See https://github.com/dunglas/mercure/blob/main/subscribe.go#L347-L362
        'Content-Type': 'text/event-stream',
        // Hop-by-hop header, forbidden in HTTP/2
        // https://www.rfc-editor.org/rfc/rfc9113#section-8.2.2
        ...(!this._isHttp2 && { Connection: 'keep-alive' }),
        // Disable cache, even for old browsers and proxies
        'Cache-Control':
          'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
        Pragma: 'no-cache',
        Expires: '0',
        // NGINX support https://www.nginx.com/resources/wiki/start/topics/examples/x-accel/#x-accel-buffering
        'X-Accel-Buffering': 'no',
      };
      // Fastify keeps its own header names (lower case), so a name that only
      // differs in case would be sent twice instead of being overridden.
      this._destination.writeHead(statusCode, {
        ...omitHeaders(additionalHeaders, Object.keys(sseHeaders)),
        ...sseHeaders,
      });
      this._destination.flushHeaders?.();
    }
    this._destination.write('\n');
  }

  private readStatusCode(): number {
    const source = this._statusCode;
    return (isFunction(source) ? source() : source) ?? 200;
  }

  private readAdditionalHeaders(): AdditionalHeaders | undefined {
    const source = this._additionalHeaders;
    return isFunction(source) ? source() : source;
  }

  _transform(
    message: MessageEvent,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void,
  ) {
    this.commitHeaders();

    const sanitize = (val: string | number) =>
      String(val).replace(/[\r\n]/g, '');

    let data = message.type ? `event: ${sanitize(message.type)}\n` : '';
    data += !isNil(message.id) ? `id: ${sanitize(message.id)}\n` : '';
    data += !isNil(message.retry) ? `retry: ${sanitize(message.retry)}\n` : '';
    data += !isNil(message.comment) ? toCommentString(message.comment) : '';
    data += !isNil(message.data) ? toDataString(message.data) : '';
    data += '\n';
    this.push(data);
    callback();
  }

  /**
   * Calls `.write` but handles the drain if needed
   */
  writeMessage(
    message: MessageEvent,
    cb: (error: Error | null | undefined) => void,
  ) {
    if (isNil(message.id) && !isCommentOnly(message)) {
      this.lastEventId!++;
      message.id = this.lastEventId!.toString();
    }

    if (!this.write(message, 'utf-8')) {
      this.once('drain', cb);
    } else {
      process.nextTick(cb);
    }
  }
}
