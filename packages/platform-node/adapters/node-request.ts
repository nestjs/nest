import encodeUrl from 'encodeurl';
import { IncomingMessage, ServerResponse, STATUS_CODES } from 'http';
import { parse as parseQueryString } from 'fast-querystring';
import { contentType as lookupContentType } from 'mime-types';
import typeIs from 'type-is';
import { getRoutingPath } from '../router/utils.js';

const QUERY = Symbol('query');
const LOCALS = Symbol('locals');

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
 * rely on (`status()`, `send()`, `json()`, `set()`, `redirect()`, `locals`...). These helpers live on
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
    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    const text = JSON.stringify(body);
    if (text === undefined) {
      this.end();
    } else {
      endWithBody(this, text);
    }
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
      endWithBody(this, body);
    } else if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      if (!this.hasHeader('Content-Type')) {
        this.setHeader('Content-Type', 'application/octet-stream');
      }
      endWithBody(this, body);
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
    return this.send(STATUS_CODES[statusCode] ?? String(statusCode));
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
