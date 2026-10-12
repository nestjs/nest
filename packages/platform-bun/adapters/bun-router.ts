import { match, type MatchFunction } from 'path-to-regexp';
import type { BunRequest } from './bun-request.js';
import type { BunResponse } from './bun-response.js';

export type NextFunction = (err?: unknown) => void;
export type RequestHandler = (
  req: BunRequest,
  res: BunResponse,
  next: NextFunction,
) => unknown;
export type ErrorRequestHandler = (
  err: unknown,
  req: BunRequest,
  res: BunResponse,
  next: NextFunction,
) => unknown;
export type AnyHandler = RequestHandler | ErrorRequestHandler;
type RouteArgs = [RequestHandler] | [string, RequestHandler];

interface Layer {
  /** Upper-case verb, or `null` for every method. */
  method: string | null;
  path: string | null;
  matcher: MatchFunction<Record<string, string>> | null;
  handler: Function;
  isError: boolean;
}

/**
 * Express-style layer stack: middleware and routes in registration order,
 * first match wins, `next()` advances, `next(err)` jumps to the next
 * 4-arity handler. Route syntax is `path-to-regexp` v8, same as Express 5.
 *
 * @publicApi
 */
export class Router {
  private readonly layers: Layer[] = [];

  public use(handler: RequestHandler): this;
  public use(handler: ErrorRequestHandler): this;
  public use(path: string, handler: RequestHandler): this;
  public use(path: string, handler: ErrorRequestHandler): this;
  public use(...handlers: AnyHandler[]): this;
  public use(path: string, ...handlers: AnyHandler[]): this;
  public use(...args: unknown[]): this {
    const path = typeof args[0] === 'string' ? (args.shift() as string) : null;
    for (const handler of args as AnyHandler[]) {
      this.add(null, path, handler, false);
    }
    return this;
  }

  public all(...args: RouteArgs): this {
    return this.route(null, args);
  }

  public get(...args: RouteArgs): this {
    return this.route('GET', args);
  }

  public post(...args: RouteArgs): this {
    return this.route('POST', args);
  }

  public put(...args: RouteArgs): this {
    return this.route('PUT', args);
  }

  public patch(...args: RouteArgs): this {
    return this.route('PATCH', args);
  }

  public delete(...args: RouteArgs): this {
    return this.route('DELETE', args);
  }

  public head(...args: RouteArgs): this {
    return this.route('HEAD', args);
  }

  public options(...args: RouteArgs): this {
    return this.route('OPTIONS', args);
  }

  public search(...args: RouteArgs): this {
    return this.route('SEARCH', args);
  }

  public query(...args: RouteArgs): this {
    return this.route('QUERY', args);
  }

  public propfind(...args: RouteArgs): this {
    return this.route('PROPFIND', args);
  }

  public proppatch(...args: RouteArgs): this {
    return this.route('PROPPATCH', args);
  }

  public mkcol(...args: RouteArgs): this {
    return this.route('MKCOL', args);
  }

  public copy(...args: RouteArgs): this {
    return this.route('COPY', args);
  }

  public move(...args: RouteArgs): this {
    return this.route('MOVE', args);
  }

  public lock(...args: RouteArgs): this {
    return this.route('LOCK', args);
  }

  public unlock(...args: RouteArgs): this {
    return this.route('UNLOCK', args);
  }

  private route(method: string | null, args: RouteArgs): this {
    const path = typeof args[0] === 'string' ? args[0] : '/';
    const handler = (
      typeof args[0] === 'string' ? args[1] : args[0]
    ) as RequestHandler;
    this.add(method, path, handler, true);
    return this;
  }

  private add(
    method: string | null,
    path: string | null,
    handler: Function,
    end: boolean,
  ): void {
    if (typeof handler !== 'function') {
      throw new TypeError('Router handlers must be functions');
    }
    const matchAll = path === null || path === '/' || path === '';
    const matcher =
      matchAll && !end
        ? null
        : match<Record<string, string>>(path ?? '/', {
            end,
            decode: decodeURIComponent,
          });
    this.layers.push({
      method,
      path,
      matcher,
      handler,
      isError: handler.length === 4,
    });
  }

  /** In-process dispatch. Resolves when the response has been committed. */
  public handle(req: BunRequest, res: BunResponse): Promise<Response> {
    this.dispatch(req, res);
    return res.response;
  }

  public dispatch(req: BunRequest, res: BunResponse): void {
    const { layers } = this;
    const method = req.method;
    const path = req.path;
    let index = 0;

    const next: NextFunction = (err?: unknown) => {
      while (index < layers.length) {
        const layer = layers[index++]!;
        if (
          layer.isError !==
          (err !== undefined && err !== null && err !== 'route')
        ) {
          continue;
        }
        if (
          layer.method &&
          layer.method !== method &&
          !(method === 'HEAD' && layer.method === 'GET')
        ) {
          continue;
        }

        if (layer.matcher) {
          let matched: ReturnType<typeof layer.matcher>;
          try {
            matched = layer.matcher(path);
          } catch (decodeError) {
            return next(decodeError);
          }
          if (!matched) {
            continue;
          }
          req.params = matched.params ?? {};
        } else {
          req.params = {};
        }

        try {
          const result = layer.isError
            ? (layer.handler as ErrorRequestHandler)(err, req, res, next)
            : (layer.handler as RequestHandler)(req, res, next);
          if (
            result &&
            typeof (result as Promise<unknown>).then === 'function'
          ) {
            (result as Promise<unknown>).then(undefined, asyncError =>
              next(asyncError ?? new Error('Handler rejected')),
            );
          }
        } catch (syncError) {
          next(syncError ?? new Error('Handler threw'));
        }
        return;
      }
      err ? this.finalError(err, req, res) : this.finalNotFound(req, res);
    };

    next();
  }

  private finalNotFound(req: BunRequest, res: BunResponse): void {
    if (res.headersSent) {
      return void res.end();
    }
    res
      .status(404)
      .type('html')
      .send(`Cannot ${req.method} ${escapeHtml(req.path)}`);
  }

  private finalError(err: unknown, _req: BunRequest, res: BunResponse): void {
    const status =
      (err as { status?: number; statusCode?: number })?.status ??
      (err as { statusCode?: number })?.statusCode;
    const code =
      typeof status === 'number' && status >= 400 && status < 600
        ? status
        : 500;
    if (code >= 500) {
      console.error(err);
    }
    if (res.headersSent) {
      return void res.end();
    }
    const expose = code < 500 && err instanceof Error;
    res
      .status(code)
      .type('txt')
      .send(
        expose
          ? err.message
          : code === 500
            ? 'Internal Server Error'
            : String(code),
      );
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}
