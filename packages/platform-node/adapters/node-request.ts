import { IncomingMessage, ServerResponse, STATUS_CODES } from 'http';
import { parse as parseQueryString } from 'fast-querystring';

const QUERY = Symbol('query');

/**
 * Request object handed to middleware and route handlers by the
 * `NodeAdapter`. It is a plain Node.js `IncomingMessage` (the HTTP server is
 * created with this class), extended with the handful of properties the Nest
 * core and common middleware read. Everything is defined on the prototype and
 * computed lazily, so a request that never reads `query` never parses the
 * query string.
 *
 * @publicApi
 */
export class NodeRequest extends IncomingMessage {
  /**
   * The request URL as received, before any mount point stripped a prefix
   * from `url`.
   */
  declare originalUrl: string;
  /**
   * Route parameters of the matched route (or middleware path).
   */
  declare params: Record<string, any>;
  /**
   * Parsed request body, set by the body parsers.
   */
  declare body: any;
  /**
   * Unparsed request body, set by the body parsers when the `rawBody`
   * application option is enabled.
   */
  declare rawBody?: Buffer;
  /**
   * Path the current middleware is mounted on (see `use(path, handler)`).
   */
  declare baseUrl: string;

  declare [QUERY]: Record<string, any> | undefined;

  /**
   * Query string parameters, parsed on first access.
   */
  get query(): Record<string, any> {
    let query = this[QUERY];
    if (query === undefined) {
      const url = this.url!;
      const index = url.indexOf('?');
      query = this[QUERY] =
        index === -1 ? {} : parseQueryString(url.slice(index + 1));
    }
    return query!;
  }

  set query(value: Record<string, any>) {
    this[QUERY] = value;
  }

  /**
   * Path name of `url` (without the query string).
   */
  get path(): string {
    const url = this.url!;
    const index = url.indexOf('?');
    return index === -1 ? url : url.slice(0, index);
  }

  /**
   * Host name from the `Host` header, without the port.
   */
  get hostname(): string | undefined {
    const host = this.headers.host;
    if (!host) {
      return undefined;
    }
    // IPv6 literal, e.g. "[::1]:3000"
    const offset =
      host.charCodeAt(0) === 91 /* [ */ ? host.indexOf(']') + 1 : 0;
    const index = host.indexOf(':', offset);
    return index === -1 ? host : host.slice(0, index);
  }

  /**
   * Remote address of the underlying socket.
   */
  get ip(): string | undefined {
    return this.socket?.remoteAddress;
  }

  get protocol(): 'http' | 'https' {
    return (this.socket as { encrypted?: boolean })?.encrypted
      ? 'https'
      : 'http';
  }

  get secure(): boolean {
    return this.protocol === 'https';
  }

  /**
   * Returns a request header (case-insensitive), like Express' `req.get()`.
   */
  get(name: string): string | string[] | undefined {
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName === 'referer' || lowerCaseName === 'referrer') {
      return this.headers.referer ?? this.headers.referrer;
    }
    return this.headers[lowerCaseName];
  }

  /**
   * Alias of {@link NodeRequest.get}.
   */
  header(name: string): string | string[] | undefined {
    return this.get(name);
  }
}

// Every request has a "body" (Express libraries check "'body' in req"), with
// no per-request property write until a parser sets one
Object.defineProperty(NodeRequest.prototype, 'body', {
  value: undefined,
  writable: true,
  configurable: true,
});

/**
 * Response object handed to middleware and route handlers by the
 * `NodeAdapter`: a plain Node.js `ServerResponse`, plus the small subset of
 * the Express response API that middleware and exception filters most often
 * rely on (`status()`, `send()`, `json()`, `set()`...). These helpers live on
 * the prototype and add no per-request cost; unlike Express, `send()` does not
 * compute an `ETag`.
 *
 * @publicApi
 */
export class NodeResponse<
  Request extends IncomingMessage = NodeRequest,
> extends ServerResponse<Request> {
  /**
   * Sets the status code. Chainable.
   */
  status(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  /**
   * Sets a response header (or several, given an object). Chainable.
   */
  set(field: string | Record<string, any>, value?: any): this {
    if (typeof field === 'string') {
      this.setHeader(
        field,
        Array.isArray(value) ? value.map(String) : String(value),
      );
    } else {
      for (const name of Object.keys(field)) {
        this.set(name, field[name]);
      }
    }
    return this;
  }

  /**
   * Alias of {@link NodeResponse.set}.
   */
  header(field: string | Record<string, any>, value?: any): this {
    return this.set(field, value);
  }

  /**
   * Returns a response header that was set earlier.
   */
  get(field: string) {
    return this.getHeader(field);
  }

  /**
   * Sets the `Content-Type` header. Chainable.
   */
  type(contentType: string): this {
    this.setHeader(
      'Content-Type',
      contentType.includes('/')
        ? contentType
        : (MIME_TYPES[contentType] ?? 'application/octet-stream'),
    );
    return this;
  }

  /**
   * Sends a JSON response.
   */
  json(body: unknown): this {
    if (endWithoutBody(this)) {
      return this;
    }
    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    this.end(JSON.stringify(body));
    return this;
  }

  /**
   * Sends a response: objects as JSON, buffers as binary, anything else as
   * text. Unlike Express, strings default to `text/plain` (as with the values
   * route handlers return); set the `Content-Type` first to send HTML.
   */
  send(body?: unknown): this {
    if (endWithoutBody(this)) {
      return this;
    }
    if (body === undefined || body === null) {
      this.end();
    } else if (typeof body === 'string') {
      if (!this.hasHeader('Content-Type')) {
        this.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      this.end(body);
    } else if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      if (!this.hasHeader('Content-Type')) {
        this.setHeader('Content-Type', 'application/octet-stream');
      }
      this.end(body);
    } else if (typeof body === 'object') {
      return this.json(body);
    } else {
      return this.send(String(body));
    }
    return this;
  }

  /**
   * Sends the status code with its reason phrase as the body.
   */
  sendStatus(statusCode: number): this {
    this.statusCode = statusCode;
    this.setHeader('Content-Type', 'text/plain; charset=utf-8');
    this.end(STATUS_CODES[statusCode] ?? String(statusCode));
    return this;
  }
}

/**
 * Ends 204, 205 and 304 responses without a body or the headers describing
 * one, as Express does: RFC 9110 forbids a body for them, and a stray
 * "Content-Length" can desynchronize keep-alive connections. Returns whether
 * the response was ended.
 */
export function endWithoutBody(response: ServerResponse): boolean {
  const { statusCode } = response;
  if (statusCode !== 204 && statusCode !== 205 && statusCode !== 304) {
    return false;
  }
  response.removeHeader('Content-Type');
  response.removeHeader('Transfer-Encoding');
  if (statusCode === 205) {
    response.setHeader('Content-Length', '0');
  } else {
    response.removeHeader('Content-Length');
  }
  response.end();
  return true;
}

const MIME_TYPES: Record<string, string> = Object.assign(Object.create(null), {
  html: 'text/html; charset=utf-8',
  text: 'text/plain; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  bin: 'application/octet-stream',
});
