import { Writable } from 'node:stream';
import type { BunFile } from 'bun';
import type { BunRequest } from './bun-request.js';
import { isObject } from '@nestjs/common/internal';
import {
  lookupType,
  normalizeContentType,
  statusText,
} from './utils/http.util.js';

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  partitioned?: boolean;
  priority?: 'low' | 'medium' | 'high';
  encode?: (value: string) => string;
}

type HeaderValue = string | string[];
type Mode = 'idle' | 'buffered' | 'streaming';

const EMPTY_STATUSES = new Set([204, 205, 304]);

/**
 * Express-shaped response that implements the `node:stream` Writable
 * interface (Bun's native implementation of it; no Node runtime involved) and
 * resolves into a Web `Response` that `Bun.serve` sends. Nest's core pipes its
 * SSE stream and `StreamableFile` into the response with `stream.pipe()`,
 * which is why the response must speak that interface.
 *
 * Two paths:
 * - `end(body)` with no prior write → the whole body is buffered and sent as
 *   one fixed-length `Response` (the common case).
 * - `write()` / `writeHead()` / `flushHeaders()` → headers are committed and
 *   the body becomes a `ReadableStream`; every later write is enqueued. This
 *   is what SSE and `StreamableFile` use.
 *
 * @publicApi
 */
export class BunResponse extends Writable {
  public statusCode = 200;
  public statusMessage = '';
  public locals: Record<string, unknown> = {};
  public readonly req: BunRequest;
  /** Resolves once headers are committed (streaming) or the body is complete (buffered). */
  public readonly response: Promise<Response>;
  [key: string]: unknown;

  private readonly headerMap = new Map<
    string,
    { name: string; value: HeaderValue }
  >();
  private mode: Mode = 'idle';
  private committed = false;
  private chunks: Buffer[] = [];
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private resolveResponse!: (response: Response) => void;
  private fileBody: BunFile | null = null;

  constructor(req: BunRequest) {
    super({ decodeStrings: true });
    this.req = req;
    this.response = new Promise(resolve => {
      this.resolveResponse = resolve;
    });
  }

  /** Watching `'close'` means the caller cares about disconnects, so start propagating aborts. */
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    if (event === 'close') {
      this.req.watchAbort();
    }
    return super.on(event, listener);
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    if (event === 'close') {
      this.req.watchAbort();
    }
    return super.once(event, listener);
  }

  // ---- Node ServerResponse surface -----------------------------------------

  public get headersSent(): boolean {
    return this.committed;
  }

  /** Node's deprecated alias, still read by some middleware. */
  public get finished(): boolean {
    return this.writableFinished;
  }

  public setHeader(name: string, value: HeaderValue | number): this {
    this.assertHeadersNotSent();
    const key = name.toLowerCase();
    this.headerMap.set(key, {
      name,
      value: Array.isArray(value) ? value.map(String) : String(value),
    });
    return this;
  }

  public getHeader(name: string): HeaderValue | undefined {
    return this.headerMap.get(name.toLowerCase())?.value;
  }

  public getHeaders(): Record<string, HeaderValue> {
    const out: Record<string, HeaderValue> = {};
    for (const [key, { value }] of this.headerMap) {
      out[key] = value;
    }
    return out;
  }

  public getHeaderNames(): string[] {
    return [...this.headerMap.keys()];
  }

  public hasHeader(name: string): boolean {
    return this.headerMap.has(name.toLowerCase());
  }

  public removeHeader(name: string): void {
    this.assertHeadersNotSent();
    this.headerMap.delete(name.toLowerCase());
  }

  public appendHeader(name: string, value: HeaderValue): this {
    this.assertHeadersNotSent();
    const key = name.toLowerCase();
    const existing = this.headerMap.get(key);
    const incoming = Array.isArray(value) ? value : [value];
    if (!existing) {
      this.headerMap.set(key, {
        name,
        value: incoming.length === 1 ? incoming[0]! : incoming,
      });
    } else {
      const current = Array.isArray(existing.value)
        ? existing.value
        : [existing.value];
      existing.value = [...current, ...incoming];
    }
    return this;
  }

  public writeHead(
    statusCode: number,
    statusMessage?: string | Record<string, HeaderValue>,
    headers?: Record<string, HeaderValue>,
  ): this {
    if (typeof statusMessage === 'object') {
      headers = statusMessage;
      statusMessage = undefined;
    }
    this.statusCode = statusCode;
    if (statusMessage) {
      this.statusMessage = statusMessage;
    }
    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        this.setHeader(name, value);
      }
    }
    this.flushHeaders();
    return this;
  }

  /** Commit headers now and switch to streaming mode. */
  public flushHeaders(): void {
    if (this.committed) {
      return;
    }
    this.mode = 'streaming';
    this.req.watchAbort(); // a streaming producer must stop when the client goes away
    const stream = new ReadableStream<Uint8Array>({
      start: controller => {
        this.controller = controller;
      },
      cancel: () => {
        this.controller = null;
        this.req.markAborted();
        if (!this.destroyed) {
          this.destroy();
        }
      },
    });
    this.commit(this.isBodyless() ? null : stream);
  }

  // ---- Writable internals -----------------------------------------------------

  public write(chunk: any, encoding?: any, callback?: any): boolean {
    if (this.mode === 'idle') {
      this.flushHeaders();
    }
    return super.write(chunk, encoding, callback);
  }

  public end(chunk?: any, encoding?: any, callback?: any): this {
    if (this.mode === 'idle') {
      this.mode = 'buffered';
    }
    return super.end(chunk, encoding, callback);
  }

  public _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.mode === 'buffered') {
      this.chunks.push(chunk);
    } else if (this.controller) {
      try {
        this.controller.enqueue(
          new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
        );
      } catch (error) {
        return callback(error as Error);
      }
    }
    callback();
  }

  public _final(callback: (error?: Error | null) => void): void {
    if (this.mode === 'streaming') {
      try {
        this.controller?.close();
      } catch {
        // stream already cancelled by the client
      }
      this.controller = null;
    } else {
      const body =
        this.fileBody ??
        (this.chunks.length === 1
          ? this.chunks[0]!
          : Buffer.concat(this.chunks));
      this.chunks = [];
      this.commit(
        this.isBodyless() ? null : (body as unknown as BodyInit),
        body,
      );
    }
    callback();
  }

  public _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.controller) {
      try {
        error ? this.controller.error(error) : this.controller.close();
      } catch {
        // already closed
      }
      this.controller = null;
    }
    if (!this.committed) {
      // Client went away before anything was sent; release the pending fetch.
      this.commit(null);
    }
    callback(error);
  }

  private commit(body: BodyInit | null, bufferedBody?: Buffer | BunFile): void {
    if (this.committed) {
      return;
    }
    this.committed = true;
    const headers = new Headers();
    for (const { name, value } of this.headerMap.values()) {
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(name, item);
        }
      } else {
        headers.set(name, value);
      }
    }
    if (
      this.req.method === 'HEAD' &&
      bufferedBody &&
      !headers.has('content-length')
    ) {
      const size =
        'size' in bufferedBody ? bufferedBody.size : bufferedBody.byteLength;
      headers.set('content-length', String(size));
    }
    this.resolveResponse(
      new Response(body, {
        status: this.statusCode,
        statusText: this.statusMessage || undefined,
        headers,
      }),
    );
  }

  private isBodyless(): boolean {
    return this.req.method === 'HEAD' || EMPTY_STATUSES.has(this.statusCode);
  }

  private assertHeadersNotSent(): void {
    if (this.committed) {
      const err = new Error(
        'Cannot set headers after they are sent to the client',
      );
      (err as Error & { code: string }).code = 'ERR_HTTP_HEADERS_SENT';
      throw err;
    }
  }

  // ---- Express surface ----------------------------------------------------------

  public status(code: number): this {
    this.statusCode = code;
    return this;
  }

  public sendStatus(code: number): this {
    this.statusCode = code;
    this.type('txt');
    return this.send(statusText(code));
  }

  /** Express `res.set()`: like `setHeader`, but adds `charset=utf-8` to text-like Content-Types. */
  public set(
    field: string | Record<string, HeaderValue | number>,
    value?: HeaderValue | number,
  ): this {
    if (typeof field === 'object') {
      for (const [name, v] of Object.entries(field)) {
        this.set(name, v);
      }
      return this;
    }
    if (field.toLowerCase() === 'content-type' && typeof value === 'string') {
      return this.setHeader(field, normalizeContentType(value));
    }
    return this.setHeader(field, value ?? '');
  }

  public header(
    field: string | Record<string, HeaderValue | number>,
    value?: HeaderValue | number,
  ): this {
    return this.set(field, value);
  }

  public get(field: string): HeaderValue | undefined {
    return this.getHeader(field);
  }

  public append(field: string, value: HeaderValue): this {
    return this.appendHeader(field, value);
  }

  public type(type: string): this {
    return this.set('Content-Type', lookupType(type));
  }

  public contentType(type: string): this {
    return this.type(type);
  }

  public vary(field: string): this {
    const current = this.getHeader('Vary');
    if (!current) {
      return this.setHeader('Vary', field);
    }
    const list = String(current)
      .split(',')
      .map(s => s.trim().toLowerCase());
    if (list.includes('*') || list.includes(field.toLowerCase())) {
      return this;
    }
    return this.setHeader('Vary', `${current}, ${field}`);
  }

  public location(url: string): this {
    return this.setHeader('Location', encodeUrl(url));
  }

  public redirect(url: string): void;
  public redirect(status: number, url: string): void;
  public redirect(statusOrUrl: number | string, maybeUrl?: string): void {
    const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const url =
      typeof statusOrUrl === 'number' ? (maybeUrl ?? '/') : statusOrUrl;
    this.location(url);
    this.statusCode = status;
    this.type('txt');
    this.send(`${statusText(status)}. Redirecting to ${url}`);
  }

  public json(body: unknown): this {
    if (!this.hasHeader('Content-Type')) {
      this.set('Content-Type', 'application/json');
    }
    return this.send(JSON.stringify(body));
  }

  public jsonp(body: unknown): this {
    return this.json(body);
  }

  public send(body?: unknown): this {
    if (body === undefined || body === null) {
      this.end();
      return this;
    }
    if (typeof body === 'string') {
      if (!this.hasHeader('Content-Type')) {
        this.set('Content-Type', 'text/html');
      }
      this.end(body);
      return this;
    }
    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      if (!this.hasHeader('Content-Type')) {
        this.setHeader('Content-Type', 'application/octet-stream');
      }
      this.end(Buffer.isBuffer(body) ? body : Buffer.from(body));
      return this;
    }
    if (
      isObject(body) ||
      typeof body === 'number' ||
      typeof body === 'boolean'
    ) {
      return this.json(body);
    }
    this.end(String(body));
    return this;
  }

  /** Zero-copy send of a `Bun.file()`; sets Content-Type/Length from the file. */
  public sendBunFile(file: BunFile): this {
    if (!this.hasHeader('Content-Type') && file.type) {
      this.setHeader('Content-Type', file.type);
    }
    if (!this.hasHeader('Content-Length')) {
      this.setHeader('Content-Length', String(file.size));
    }
    this.fileBody = file;
    this.end();
    return this;
  }

  /** Express `res.sendFile(absolutePath)`; the path must be absolute. */
  public async sendFile(
    path: string,
    options: { headers?: Record<string, string> } = {},
    callback?: (err?: Error) => void,
  ): Promise<void> {
    try {
      const file = Bun.file(path);
      if (!(await file.exists())) {
        throw Object.assign(new Error(`ENOENT: no such file '${path}'`), {
          status: 404,
          code: 'ENOENT',
        });
      }
      if (options.headers) {
        this.set(options.headers);
      }
      this.sendBunFile(file);
      callback?.();
    } catch (error) {
      if (callback) {
        callback(error as Error);
      } else {
        throw error;
      }
    }
  }

  public cookie(
    name: string,
    value: string | object,
    options: CookieOptions = {},
  ): this {
    const serialized =
      typeof value === 'object' ? `j:${JSON.stringify(value)}` : String(value);
    const cookieOptions = { ...options };
    if (
      cookieOptions.maxAge !== undefined &&
      cookieOptions.expires === undefined
    ) {
      cookieOptions.expires = new Date(Date.now() + cookieOptions.maxAge);
      cookieOptions.maxAge = Math.floor(cookieOptions.maxAge / 1000);
    }
    return this.appendHeader(
      'Set-Cookie',
      serializeCookie(name, serialized, cookieOptions),
    );
  }

  public clearCookie(name: string, options: CookieOptions = {}): this {
    return this.cookie(name, '', {
      path: '/',
      ...options,
      expires: new Date(1),
      maxAge: undefined,
    });
  }

  /** Attaches a `render` implementation; installed by the adapter when a view engine is set. */
  public render(
    view: string,
    options?: object,
    callback?: (err: Error | null, html?: string) => void,
  ): void {
    const renderer = this.viewRenderer;
    if (!renderer) {
      const err = new Error(
        'No view engine configured. Call app.setViewEngine() first.',
      );
      if (callback) {
        return callback(err);
      }
      throw err;
    }
    void renderer(view, { ...this.locals, ...options }).then(
      html => {
        if (callback) {
          return callback(null, html);
        }
        this.type('html').send(html);
      },
      err => {
        if (callback) {
          return callback(err);
        }
        this.emit('error', err);
      },
    );
  }

  /** @internal set by the adapter */
  public viewRenderer?: (view: string, options: object) => Promise<string>;
}

function encodeUrl(url: string): string {
  return url.replace(/[^\x21-\x7E]|[<>"`{}|\\^]/g, char =>
    encodeURIComponent(char),
  );
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const encode = options.encode ?? encodeURIComponent;
  let cookie = `${name}=${encode(value)}`;
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }
  cookie += `; Path=${options.path ?? '/'}`;
  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }
  if (options.secure) {
    cookie += '; Secure';
  }
  if (options.partitioned) {
    cookie += '; Partitioned';
  }
  if (options.priority) {
    cookie += `; Priority=${options.priority[0]!.toUpperCase()}${options.priority.slice(1)}`;
  }
  if (options.sameSite) {
    const sameSite =
      options.sameSite === true
        ? 'Strict'
        : options.sameSite[0]!.toUpperCase() + options.sameSite.slice(1);
    cookie += `; SameSite=${sameSite}`;
  }
  return cookie;
}
