import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { Server, SocketAddress } from 'bun';
import type { BunResponse } from './bun-response.js';
import { parseQuery } from './utils/http.util.js';

/** Minimal `net.Socket` stand-in: Nest's SSE support and some middleware poke at it. */
/**
 * @publicApi
 */
export class BunSocket extends EventEmitter {
  public remoteAddress?: string;
  public remotePort?: number;
  public remoteFamily?: string;
  public localPort?: number;
  public encrypted = false;
  public destroyed = false;

  constructor(private readonly request?: BunRequest) {
    super();
  }

  /** Listening for `'close'` is what SSE does to detect disconnects, so only then do we watch the abort signal. */
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    if (event === 'close') {
      this.request?.watchAbort();
    }
    return super.on(event, listener);
  }
  public once(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    if (event === 'close') {
      this.request?.watchAbort();
    }
    return super.once(event, listener);
  }
  public addListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    return this.on(event, listener);
  }

  public setKeepAlive(): this {
    return this;
  }
  public setNoDelay(): this {
    return this;
  }
  public setTimeout(): this {
    return this;
  }
  public ref(): this {
    return this;
  }
  public unref(): this {
    return this;
  }
  public destroy(): this {
    if (!this.destroyed) {
      this.destroyed = true;
      this.emit('close');
    }
    return this;
  }
}

export interface BunRequestInit {
  server?: Server<unknown> | null;
  trustProxy?: boolean;
}

/**
 * Express-shaped request built from a Web `Request`. Extends `Readable` so
 * stream-based middleware (multipart parsers, etc.) can consume the body.
 *
 * Everything that is not needed on the hot path (`query`, `headers`, `socket`,
 * `ip`, `hostname`, the abort listener) is computed lazily on first access.
 *
 * The underlying Web `Request` is exposed as `native` (not `raw`: Nest reads
 * `req.raw` as a Node `IncomingMessage` for SSE).
 *
 * @publicApi
 */
export class BunRequest extends Readable {
  public readonly native: Request;
  public readonly method: string;
  /** Path + query string, e.g. `/users?limit=5`. Same as `originalUrl` (no router mounting). */
  public url: string;
  public readonly originalUrl: string;
  public readonly path: string;
  public baseUrl = '';
  public params: Record<string, string> = {};
  public body: unknown = undefined;
  public rawBody?: Buffer;
  public readonly signal: AbortSignal;
  public readonly httpVersion = '1.1';
  public readonly httpVersionMajor = 1;
  public readonly httpVersionMinor = 1;
  public aborted = false;
  public complete = false;
  public res?: BunResponse;
  /** Set by third-party middleware (sessions, uploads). */
  public session?: unknown;
  public file?: unknown;
  public files?: unknown;
  [key: string]: unknown;

  private readonly search: string;
  private readonly trustProxy: boolean;
  private readonly server: Server<unknown> | null;
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortWatched = false;
  private _query?: Record<string, string | string[]>;
  private _headers?: Record<string, string>;
  private _socket?: BunSocket;
  private _remote?: SocketAddress | null;

  constructor(native: Request, init: BunRequestInit = {}) {
    super();
    this.native = native;
    this.method = native.method.toUpperCase();
    this.signal = native.signal;
    this.trustProxy = init.trustProxy === true;
    this.server = init.server ?? null;

    // "scheme://host[:port]/path?query" → split without paying for `new URL()`.
    const full = native.url;
    const pathStart = full.indexOf('/', full.indexOf('//') + 2);
    const rest = pathStart === -1 ? '/' : full.slice(pathStart);
    const queryStart = rest.indexOf('?');
    this.path = queryStart === -1 ? rest : rest.slice(0, queryStart);
    this.search = queryStart === -1 ? '' : rest.slice(queryStart);
    this.url = rest;
    this.originalUrl = rest;
  }

  /** Express 5 "simple" query parsing, computed on first access. */
  public get query(): Record<string, string | string[]> {
    return (this._query ??= parseQuery(this.search));
  }

  /** Lower-cased header map, built on first access. */
  public get headers(): Record<string, string> {
    if (!this._headers) {
      const headers: Record<string, string> = {};
      this.native.headers.forEach((value, key) => {
        headers[key] = value;
      });
      this._headers = headers;
    }
    return this._headers;
  }

  public get ips(): string[] {
    const forwarded = this.trustProxy
      ? this.headers['x-forwarded-for']
      : undefined;
    return forwarded ? forwarded.split(',').map(s => s.trim()) : [];
  }

  public get ip(): string | undefined {
    return this.ips[0] ?? this.remote?.address;
  }

  public get protocol(): 'http' | 'https' {
    const forwarded = this.trustProxy
      ? this.headers['x-forwarded-proto']?.split(',')[0]?.trim()
      : undefined;
    const proto =
      forwarded ?? (this.native.url.startsWith('https:') ? 'https' : 'http');
    return proto.toLowerCase() === 'https' ? 'https' : 'http';
  }

  public get secure(): boolean {
    return this.protocol === 'https';
  }

  public get host(): string {
    const forwarded = this.trustProxy
      ? this.headers['x-forwarded-host']?.split(',')[0]?.trim()
      : undefined;
    return forwarded ?? this.headers['host'] ?? hostOf(this.native.url);
  }

  public get hostname(): string {
    return stripPort(this.host);
  }

  public get socket(): BunSocket {
    if (!this._socket) {
      const socket = new BunSocket(this);
      const remote = this.remote;
      socket.remoteAddress = remote?.address;
      socket.remotePort = remote?.port;
      socket.remoteFamily = remote?.family;
      socket.encrypted = this.secure;
      this._socket = socket;
    }
    return this._socket;
  }

  private get remote(): SocketAddress | null {
    if (this._remote === undefined) {
      this._remote = this.server?.requestIP(this.native) ?? null;
    }
    return this._remote;
  }

  /** Express `req.get()` / `req.header()`: case-insensitive header lookup. */
  public get(name: string): string | undefined {
    const key = name.toLowerCase();
    if (key === 'referer' || key === 'referrer') {
      return this.headers['referer'] ?? this.headers['referrer'];
    }
    return this.headers[key];
  }

  public header(name: string): string | undefined {
    return this.get(name);
  }

  /** Express `req.is()`: does the Content-Type match? Returns `null` when there is no body. */
  public is(...types: string[]): string | false | null {
    if (!hasBody(this)) {
      return null;
    }
    const contentType = mime(this.headers['content-type']);
    if (!contentType) {
      return false;
    }
    for (const type of types.flat()) {
      if (typeMatches(contentType, type)) {
        return type;
      }
    }
    return false;
  }

  /** Whether the body has already been consumed (by a parser or the stream). */
  public get bodyUsed(): boolean {
    return this.native.bodyUsed || this.streamReader !== null;
  }

  /** Start propagating client aborts to `socket`, this stream and the response. Idempotent. */
  public watchAbort(): void {
    if (this.abortWatched) {
      return;
    }
    this.abortWatched = true;
    if (this.signal.aborted) {
      return this.markAborted();
    }
    this.signal.addEventListener('abort', () => this.markAborted(), {
      once: true,
    });
  }

  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    if (event === 'close' || event === 'aborted') {
      this.watchAbort();
    }
    return super.on(event, listener);
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    if (event === 'close' || event === 'aborted') {
      this.watchAbort();
    }
    return super.once(event, listener);
  }

  public markAborted(): void {
    if (this.aborted) {
      return;
    }
    this.aborted = true;
    this._socket?.destroy();
    this.emit('aborted');
    if (!this.destroyed) {
      this.destroy();
    }
    if (this.res && !this.res.destroyed) {
      this.res.destroy();
    }
  }

  public _read(): void {
    if (!this.native.body) {
      this.push(null);
      return;
    }
    this.streamReader ??= this.native.body.getReader();
    this.streamReader.read().then(
      ({ done, value }) => {
        if (done) {
          this.complete = true;
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      },
      err => this.destroy(err),
    );
  }
}

function hostOf(url: string): string {
  const start = url.indexOf('//') + 2;
  const end = url.indexOf('/', start);
  return end === -1 ? url.slice(start) : url.slice(start, end);
}

export function stripPort(host: string): string {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end === -1 ? host : host.slice(1, end);
  }
  const portStart = host.indexOf(':');
  return portStart === -1 ? host : host.slice(0, portStart);
}

export function hasBody(req: BunRequest): boolean {
  if (req.headers['transfer-encoding'] !== undefined) {
    return true;
  }
  const len = req.headers['content-length'];
  if (len !== undefined) {
    return !Number.isNaN(Number(len)) && Number(len) > 0;
  }
  // In-process requests (adapter.fetch) carry no Content-Length; trust the Web Request.
  return req.native.body !== null;
}

/** Strip parameters from a Content-Type value. */
export function mime(contentType: string | undefined): string | undefined {
  if (!contentType) {
    return undefined;
  }
  return contentType.split(';')[0]!.trim().toLowerCase();
}

/** `type-is`-style matching: `json`, `application/json`, wildcard subtypes, `+json` suffixes. */
export function typeMatches(actual: string, expected: string): boolean {
  const expectedType = expected.toLowerCase();
  if (expectedType === actual) {
    return true;
  }
  if (!expectedType.includes('/')) {
    if (expectedType.startsWith('+')) {
      return actual.endsWith(expectedType);
    }
    return (
      actual === `application/${expectedType}` ||
      actual === `text/${expectedType}` ||
      actual.endsWith(`+${expectedType}`)
    );
  }
  const [expectedMain, expectedSub] = expectedType.split('/') as [
    string,
    string,
  ];
  const [actualMain, actualSub] = actual.split('/') as [string, string];
  if (expectedMain !== '*' && expectedMain !== actualMain) {
    return false;
  }
  if (expectedSub === '*') {
    return true;
  }
  if (expectedSub.startsWith('*+')) {
    return actualSub.endsWith(expectedSub.slice(1));
  }
  return expectedSub === actualSub;
}
