import { serialize as serializeCookie } from 'cookie';
import { sign as signCookie } from 'cookie-signature';
import encodeUrl from 'encodeurl';
import { IncomingMessage, ServerResponse, STATUS_CODES } from 'http';
import { parse as parseQueryString } from 'fast-querystring';
import { contentType as lookupContentType } from 'mime-types';
import onFinished from 'on-finished';
import { isAbsolute } from 'path';
import send from 'send';
import typeIs from 'type-is';
import { getRoutingPath } from '../router/utils.js';

const QUERY = Symbol('query');
const LOCALS = Symbol('locals');

/**
 * Set by the `NodeAdapter` on the HTTP server it creates: a function that
 * runs the error-handling middleware (and Nest's exception filters) for an
 * error raised after the route handler returned, such as by
 * `res.sendFile()`. Express reaches them through the `next()` it stores on
 * every request; the server is reachable from the request's socket, so this
 * costs nothing per request.
 *
 * @internal
 */
export const ROUTE_ERROR_HANDLER = Symbol('nestjs.node.routeErrorHandler');

/**
 * What `req.app` returns: middleware written for Express reads settings from
 * it (`express-rate-limit` checks `req.app.get('trust proxy')`). There are no
 * Express settings here; `get()` reports the adapter's fixed behavior.
 */
const NODE_APP = Object.freeze({
  /**
   * `'trust proxy'` is `false` (`req.ip` is the socket address); every other
   * setting is `undefined`.
   */
  get(setting: string): unknown {
    return setting === 'trust proxy' ? false : undefined;
  },
});

/**
 * Options of {@link NodeResponse.sendFile}, those of the `send` package, as
 * with Express' `res.sendFile()`.
 */
export interface NodeSendFileOptions {
  /** Directory a relative `path` is resolved against. */
  root?: string;
  /** `Cache-Control` max-age, in milliseconds or as a string ("1d"). */
  maxAge?: number | string;
  /** Extra headers, set once the file is known to exist. */
  headers?: Record<string, string | number | string[]>;
  /** How to treat dotfiles: `'ignore'` (404, the default), `'allow'` or `'deny'` (403). */
  dotfiles?: 'allow' | 'deny' | 'ignore';
  /** Whether to send an `ETag`. Defaults to `true`, as with Express. */
  etag?: boolean;
  lastModified?: boolean;
  cacheControl?: boolean;
  immutable?: boolean;
  acceptRanges?: boolean;
}

/**
 * Options of {@link NodeResponse.cookie}, as with Express' `res.cookie()`.
 */
export interface NodeCookieOptions {
  /** Lifetime in milliseconds (sent as `Expires` and `Max-Age`). */
  maxAge?: number;
  expires?: Date;
  /** Defaults to `/`. */
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  priority?: 'low' | 'medium' | 'high';
  partitioned?: boolean;
  /** Signs the value with the secret `cookie-parser` sets on `req.secret`. */
  signed?: boolean;
  /** Encodes the value; `encodeURIComponent()` by default. */
  encode?: (value: string) => string;
}

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
   * Path of `url`, as the router matches it: the path of an absolute-form
   * target, percent-decoded except for reserved characters such as "%2F",
   * without the query string. Unlike Express' `req.path`, which keeps the
   * percent-encoding, a middleware checking it sees the path the routes see.
   */
  get path(): string {
    const url = this.url!;
    try {
      return getRoutingPath(url);
    } catch {
      // A malformed URL, which reaches no route (see NodeRouter)
      const index = url.indexOf('?');
      return index === -1 ? url : url.slice(0, index);
    }
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
      return this.headers.referrer || this.headers.referer;
    }
    return this.headers[lowerCaseName];
  }

  /**
   * Alias of {@link NodeRequest.get}.
   */
  header(name: string): string | string[] | undefined {
    return this.get(name);
  }

  /**
   * Stand-in for the Express application, for middleware that reads its
   * settings: `req.app.get('trust proxy')` is `false`, every other setting
   * `undefined`.
   */
  get app(): { get(setting: string): unknown } {
    return NODE_APP;
  }

  /**
   * Checks the request's `Content-Type` against `types`, like Express'
   * `req.is()`: returns the first matching type, `false` when none matches and
   * `null` when the request has no body. Types may be MIME types, wildcards
   * (`'text/*'`, `'+json'`) or extensions (`'json'`, `'html'`). Without
   * arguments, returns the request's media type.
   */
  is(...types: (string | string[])[]): string | false | null {
    return typeIs(this, types.flat());
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
 * rely on (`status()`, `send()`, `json()`, `set()`, `append()`, `cookie()`,
 * `redirect()`, `sendFile()`, `locals`...). These helpers live on
 * the prototype and add no per-request cost; unlike Express, `send()` does not
 * compute an `ETag`.
 *
 * @publicApi
 */
export class NodeResponse<
  Request extends IncomingMessage = NodeRequest,
> extends ServerResponse<Request> {
  declare [LOCALS]: Record<string, any> | undefined;

  /**
   * Values scoped to this response, like Express' `res.locals`, for
   * middleware to pass data along. Created on first access.
   */
  get locals(): Record<string, any> {
    return (this[LOCALS] ??= Object.create(null));
  }

  set locals(value: Record<string, any>) {
    this[LOCALS] = value;
  }

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
   * Appends a value to a response header, creating the header when missing,
   * like Express' `res.append()`. Chainable.
   */
  append(field: string, value: string | string[]): this {
    const previous = this.getHeader(field);
    let combined: unknown = value;
    if (previous) {
      combined = Array.isArray(previous)
        ? previous.concat(value)
        : Array.isArray(value)
          ? [previous, ...value]
          : [previous, value];
    }
    return this.set(field, combined);
  }

  /**
   * Sets a cookie, like Express' `res.cookie()`, for middleware written for
   * Express: objects are sent as `j:` + JSON, `maxAge` is in milliseconds and
   * `signed` uses the secret `cookie-parser` sets on `req.secret`. In your own
   * handlers, prefer Nest's adapter-agnostic cookies (`setCookie()`).
   * Chainable.
   */
  cookie(name: string, value: unknown, options?: NodeCookieOptions): this {
    const opts: Record<string, any> = { ...options };
    const secret = (this.req as { secret?: string }).secret;
    if (opts.signed && !secret) {
      throw new Error('cookieParser("secret") required for signed cookies');
    }
    let text =
      typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);
    if (opts.signed) {
      text = 's:' + signCookie(text, secret!);
    }
    if (opts.maxAge != null) {
      const maxAge = opts.maxAge - 0;
      if (!Number.isNaN(maxAge)) {
        opts.expires = new Date(Date.now() + maxAge);
        opts.maxAge = Math.floor(maxAge / 1000);
      }
    }
    if (opts.path == null) {
      opts.path = '/';
    }
    return this.append('Set-Cookie', serializeCookie(name, String(text), opts));
  }

  /**
   * Expires a cookie, like Express' `res.clearCookie()`; `path` and `domain`
   * must match the ones the cookie was set with. Chainable.
   */
  clearCookie(name: string, options?: NodeCookieOptions): this {
    const opts: NodeCookieOptions = {
      path: '/',
      ...options,
      expires: new Date(1),
    };
    delete opts.maxAge;
    return this.cookie(name, '', opts);
  }

  /**
   * Returns a response header that was set earlier.
   */
  get(field: string) {
    return this.getHeader(field);
  }

  /**
   * Sets the `Content-Type` header, given a MIME type or, as with Express, a
   * file extension (`'json'`, `'.html'`, `'png'`). Chainable.
   */
  type(type: string): this {
    this.setHeader(
      'Content-Type',
      type.includes('/')
        ? type
        : lookupContentType(type) || 'application/octet-stream',
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
    // Before any header, in case it throws (a BigInt, a circular reference)
    const text = JSON.stringify(body);
    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    if (text === undefined) {
      this.end();
    } else {
      endWithBody(this, text);
    }
    return this;
  }

  /**
   * Sends a response: objects, numbers and booleans as JSON, buffers, typed
   * arrays and `DataView`s as binary, anything else as text. Unlike Express,
   * strings default to `text/plain` (as with the values route handlers
   * return); set the `Content-Type` first to send HTML.
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
      endWithBody(this, body);
    } else if (ArrayBuffer.isView(body)) {
      if (!this.hasHeader('Content-Type')) {
        this.setHeader('Content-Type', 'application/octet-stream');
      }
      endWithBody(this, toBytes(body));
    } else if (
      typeof body === 'object' ||
      typeof body === 'number' ||
      typeof body === 'boolean'
    ) {
      // As with Express 5
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
    return this.send(STATUS_CODES[statusCode] ?? String(statusCode));
  }

  /**
   * Streams a file, like Express' `res.sendFile()` (both build on the `send`
   * package): `Content-Type` from the extension, `Content-Length`,
   * `Last-Modified`, `ETag`, ranges and conditional requests (304). `path` is
   * absolute, or relative to `options.root`.
   *
   * `callback(err)` is called once the transfer is done or failed (check
   * `res.headersSent` before responding). Without one, a failure goes to the
   * error-handling middleware and Nest's exception filters, as with Express:
   * a missing file is a 404, a directory answers like an unmatched route.
   */
  sendFile(
    path: string,
    options?: NodeSendFileOptions | ((err?: Error) => void) | null,
    callback?: (err?: Error) => void,
  ): void {
    if (!path) {
      throw new TypeError('path argument is required to res.sendFile');
    }
    if (typeof path !== 'string') {
      throw new TypeError('path must be a string to res.sendFile');
    }
    let done = callback;
    let opts: NodeSendFileOptions = {};
    if (typeof options === 'function') {
      done = options;
    } else if (options) {
      opts = { ...options };
    }
    if (!opts.root && !isAbsolute(path)) {
      throw new TypeError(
        'path must be absolute or specify root to res.sendFile',
      );
    }
    opts.etag ??= true;
    const req = this.req;
    const file = send(req, encodeURI(path), opts as send.SendOptions);
    transferFile(this, file, opts, err => {
      if (done) {
        return done(err);
      }
      // Client aborts and write errors are nothing to report, as with Express
      if (
        !err ||
        (err as any).code === 'ECONNABORTED' ||
        (err as any).syscall === 'write'
      ) {
        return;
      }
      const handleError = (req.socket as any)?.server?.[ROUTE_ERROR_HANDLER];
      if (handleError) {
        handleError(err, req, this);
      } else {
        respondWithError(this, err);
      }
    });
  }

  /**
   * Redirects to `url` (encoded into the `Location` header), with a 302 unless
   * a status code is given first, like Express' `res.redirect()`. The body is
   * a short note in plain text or HTML, whichever the client's `Accept`
   * header prefers, and empty when it accepts neither.
   */
  redirect(url: string): void;
  redirect(statusCode: number, url: string): void;
  redirect(statusCodeOrUrl: number | string, url?: string): void {
    const statusCode =
      typeof statusCodeOrUrl === 'number' ? statusCodeOrUrl : 302;
    const location = encodeUrl(
      typeof statusCodeOrUrl === 'number' ? url! : statusCodeOrUrl,
    );
    const message = STATUS_CODES[statusCode] ?? String(statusCode);
    let body = '';
    switch (preferredRedirectType(this.req.headers.accept)) {
      case 'text':
        this.setHeader('Content-Type', 'text/plain; charset=utf-8');
        body = `${message}. Redirecting to ${location}`;
        break;
      case 'html':
        this.setHeader('Content-Type', 'text/html; charset=utf-8');
        body = `<p>${message}. Redirecting to ${escapeHtml(location)}</p>`;
        break;
    }
    this.statusCode = statusCode;
    this.setHeader('Location', location);
    appendVary(this, 'Accept');
    this.setHeader('Content-Length', Buffer.byteLength(body));
    this.end(this.req.method === 'HEAD' ? undefined : body);
  }
}

/**
 * Pipes a `send` stream into the response and calls `callback` once, when the
 * transfer ended, failed or was aborted: Express' `sendfile()`.
 */
function transferFile(
  res: ServerResponse,
  file: send.SendStream,
  options: NodeSendFileOptions,
  callback: (err?: Error) => void,
) {
  let done = false;
  let streaming: boolean | undefined;
  const finish = (err?: Error) => {
    if (!done) {
      done = true;
      callback(err);
    }
  };
  const onAborted = () =>
    finish(
      Object.assign(new Error('Request aborted'), { code: 'ECONNABORTED' }),
    );

  file.on('directory', () =>
    finish(Object.assign(new Error('EISDIR, read'), { code: 'EISDIR' })),
  );
  file.on('end', () => finish());
  file.on('error', (err: Error) => finish(err));
  file.on('file', () => {
    streaming = false;
  });
  file.on('stream', () => {
    streaming = true;
  });
  onFinished(res, (err: any) => {
    if (err && err.code === 'ECONNRESET') {
      return onAborted();
    }
    if (err) {
      return finish(err);
    }
    if (done) {
      return;
    }
    setImmediate(() => {
      if (streaming !== false && !done) {
        onAborted();
        return;
      }
      finish();
    });
  });
  if (options.headers) {
    const headers = options.headers;
    file.on('headers', (response: ServerResponse) => {
      for (const name of Object.keys(headers)) {
        response.setHeader(name, headers[name]);
      }
    });
  }
  file.pipe(res);
}

/**
 * Answers an error with its status and reason phrase, when there is no
 * adapter to hand it to (a `NodeRouter` mounted in another server).
 */
function respondWithError(res: ServerResponse, err: any) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  // A directory answers like a missing file
  const status =
    err?.code === 'EISDIR' ? 404 : (err?.statusCode ?? err?.status);
  res.statusCode = status >= 400 && status < 600 ? status : 500;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(STATUS_CODES[res.statusCode]);
}

/**
 * Picks the redirect body Express would send for an `Accept` header: the
 * candidate with the highest quality, then the most specific matching range,
 * then the earlier range, then plain text over HTML (Express' order); `null`
 * when neither is acceptable.
 */
function preferredRedirectType(
  accept: string | undefined,
): 'text' | 'html' | null {
  if (!accept) {
    return 'text';
  }
  const ranges = accept.split(',').map((part, order) => {
    const [range, ...params] = part.trim().toLowerCase().split(';');
    const qParam = params.find(param => param.trim().startsWith('q='));
    const q = qParam ? Number(qParam.trim().slice(2)) : 1;
    const [type, subtype] = range.trim().split('/');
    return { type, subtype, q: Number.isNaN(q) ? 0 : q, order };
  });
  const rank = (subtype: 'plain' | 'html') => {
    let best: { q: number; specificity: number; order: number } | undefined;
    for (const range of ranges) {
      const specificity =
        range.type === 'text' && range.subtype === subtype
          ? 2
          : range.type === 'text' && range.subtype === '*'
            ? 1
            : range.type === '*' && range.subtype === '*'
              ? 0
              : -1;
      if (specificity > (best?.specificity ?? -1)) {
        best = { q: range.q, specificity, order: range.order };
      }
    }
    return best;
  };
  const text = rank('plain');
  const html = rank('html');
  const acceptable = [
    text && text.q > 0 ? { type: 'text' as const, ...text } : undefined,
    html && html.q > 0 ? { type: 'html' as const, ...html } : undefined,
  ].filter(candidate => candidate !== undefined);
  acceptable.sort(
    (a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order,
  );
  return acceptable[0]?.type ?? null;
}

function appendVary(response: ServerResponse, field: string) {
  const vary = response.getHeader('Vary');
  if (vary === undefined) {
    response.setHeader('Vary', field);
    return;
  }
  const value = Array.isArray(vary) ? vary.join(', ') : String(vary);
  const fields = value.split(',').map(name => name.trim().toLowerCase());
  if (!fields.includes('*') && !fields.includes(field.toLowerCase())) {
    response.setHeader('Vary', value ? `${value}, ${field}` : field);
  }
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

/**
 * The bytes of a `Buffer`, a typed array or a `DataView`, which are sent as
 * binary (as Fastify does) rather than serialized to JSON.
 */
export function toBytes(view: ArrayBufferView): Uint8Array {
  return view instanceof Uint8Array
    ? view
    : new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

// With an explicit "Content-Length", which Node.js leaves out in answer to
// HEAD requests otherwise
function endWithBody(response: ServerResponse, body: string | Uint8Array) {
  response.setHeader(
    'Content-Length',
    typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength,
  );
  response.end(body);
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
