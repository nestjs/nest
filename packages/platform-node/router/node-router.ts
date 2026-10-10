import type { IncomingMessage, ServerResponse } from 'http';
import { match } from 'path-to-regexp';
import { NodeRequest, NodeResponse } from '../adapters/node-request.js';
import { type RouteHandler, RouteTable } from './route-table.js';
import { getRawPrefixEnd, getRoutingPath, loosen } from './utils.js';

type NextFunction = (err?: any) => void;
type PathMatcher = (path: string) => false | { path: string; params: any };

interface MiddlewareLayer {
  table?: undefined;
  /** `null` matches every path. */
  matcher: PathMatcher | null;
  /** Strip the matched path from `req.url` (a `use(path, ...)` mount). */
  isMount: boolean;
  /** Upper-case method, or `undefined` for every method. */
  method: string | undefined;
  handler: Function;
  isErrorHandler: boolean;
}

interface RouterLayer {
  table: RouteTable;
}

type Layer = MiddlewareLayer | RouterLayer;

/**
 * Callback invoked when a request falls off the end of the stack.
 */
export type FinalHandler = (
  err: any,
  req: NodeRequest,
  res: NodeResponse,
) => void;

function decodeParam(value: string) {
  return decodeURIComponent(value);
}

function invoke(
  handler: Function,
  req: any,
  res: any,
  next: NextFunction,
  err?: any,
) {
  try {
    const result =
      err === undefined
        ? handler(req, res, next)
        : handler(err, req, res, next);
    if (result !== undefined && typeof result?.then === 'function') {
      // As in Express 5: a rejected promise is forwarded to the error handlers
      result.then(undefined, (reason: unknown) =>
        next(reason || new Error('Rejected promise')),
      );
    }
  } catch (error) {
    next(error || new Error('Thrown falsy value'));
  }
}

// Like an Express application, a router is itself a request listener: its
// constructor returns a function, whose call signature this interface adds.
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface NodeRouter {
  (req: IncomingMessage, res: ServerResponse, done?: NextFunction): void;
}

/**
 * Minimal, Express-compatible request pipeline on top of the Node.js HTTP
 * server: an ordered stack of middleware (`use()`, connect-style
 * `(req, res, next)` and error-handling `(err, req, res, next)` functions)
 * and routes. Contiguous route registrations are grouped into a
 * {@link RouteTable}, so a request walks the (short) middleware list and does
 * a single radix-tree lookup, however many routes the application has.
 *
 * @publicApi
 */
export class NodeRouter {
  declare private stack: Layer[];
  declare private finalHandler: FinalHandler;

  constructor(finalHandler: FinalHandler) {
    const router = ((
      req: IncomingMessage,
      res: ServerResponse,
      done?: NextFunction,
    ) => router.handle(req, res, done)) as NodeRouter;
    Object.setPrototypeOf(router, new.target.prototype);
    router.stack = [];
    router.finalHandler = finalHandler;
    return router;
  }

  /**
   * Request listener for `http.createServer()`. `done` is called instead of
   * the final handler when the request falls off the stack, which allows
   * mounting the router inside another framework.
   */
  public handle(
    req: IncomingMessage,
    res: ServerResponse,
    done?: NextFunction,
  ) {
    if (!(req instanceof NodeRequest)) {
      Object.setPrototypeOf(req, NodeRequest.prototype);
    }
    if (!(res instanceof NodeResponse)) {
      Object.setPrototypeOf(res, NodeResponse.prototype);
    }
    this.dispatch(req as NodeRequest, res as NodeResponse, done);
  }

  public get(...args: any[]) {
    return this.addRoute('GET', args);
  }

  public post(...args: any[]) {
    return this.addRoute('POST', args);
  }

  public put(...args: any[]) {
    return this.addRoute('PUT', args);
  }

  public delete(...args: any[]) {
    return this.addRoute('DELETE', args);
  }

  public patch(...args: any[]) {
    return this.addRoute('PATCH', args);
  }

  public options(...args: any[]) {
    return this.addRoute('OPTIONS', args);
  }

  public head(...args: any[]) {
    return this.addRoute('HEAD', args);
  }

  public all(...args: any[]) {
    return this.addRoute(null, args);
  }

  public search(...args: any[]) {
    return this.addRoute('SEARCH', args);
  }

  public query(...args: any[]) {
    return this.addRoute('QUERY', args);
  }

  public propfind(...args: any[]) {
    return this.addRoute('PROPFIND', args);
  }

  public proppatch(...args: any[]) {
    return this.addRoute('PROPPATCH', args);
  }

  public mkcol(...args: any[]) {
    return this.addRoute('MKCOL', args);
  }

  public copy(...args: any[]) {
    return this.addRoute('COPY', args);
  }

  public move(...args: any[]) {
    return this.addRoute('MOVE', args);
  }

  public lock(...args: any[]) {
    return this.addRoute('LOCK', args);
  }

  public unlock(...args: any[]) {
    return this.addRoute('UNLOCK', args);
  }

  public use(...args: any[]) {
    const [path, handlers] =
      typeof args[0] === 'string' ? [args[0], args.slice(1)] : ['/', args];
    const isRoot = path === '/' || path === '';
    const matcher = isRoot
      ? null
      : (match(loosen(path), {
          decode: decodeParam,
          end: false,
        }) as PathMatcher);

    for (const handler of handlers.flat()) {
      if (typeof handler !== 'function') {
        throw new TypeError(
          `NodeRouter.use() requires a middleware function, received ${typeof handler}`,
        );
      }
      this.stack.push({
        matcher,
        isMount: !isRoot,
        method: undefined,
        handler,
        isErrorHandler: handler.length === 4,
      });
    }
    return this;
  }

  /**
   * Registers a route. `method` is upper-case, or `null` for every method.
   */
  public route(method: string | null, path: string, handler: RouteHandler) {
    let last = this.stack[this.stack.length - 1];
    if (!last?.table) {
      last = { table: new RouteTable() };
      this.stack.push(last);
    }
    last.table.add(method, path, handler);
    return this;
  }

  /**
   * Registers a middleware that runs only for requests whose whole path
   * matches `path` (like a route, unlike a `use()` mount), and, when given,
   * whose method is `method`.
   */
  public useExact(method: string | undefined, path: string, handler: Function) {
    this.stack.push({
      matcher: match(loosen(path), {
        decode: decodeParam,
        end: true,
      }) as PathMatcher,
      isMount: false,
      method,
      handler,
      isErrorHandler: false,
    });
    return this;
  }

  // `get(handler)`, `get(path, handler)` or `get(path, ...handlers)`; several
  // handlers run in a row, passing control through `next()`
  private addRoute(method: string | null, args: any[]) {
    const [path, handlers] =
      typeof args[0] === 'string' ? [args[0], args.slice(1)] : ['/', args];
    for (const handler of handlers.flat()) {
      this.route(method, path, handler);
    }
    return this;
  }

  /**
   * Whether a middleware with the given function name is already registered.
   */
  public hasMiddleware(name: string) {
    return this.stack.some(
      layer => !layer.table && (layer.handler as Function).name === name,
    );
  }

  private dispatch(
    req: NodeRequest,
    res: NodeResponse,
    done: NextFunction | undefined,
  ) {
    const stack = this.stack;
    const method = req.method!;
    let index = 0;
    let routeHandlers: RouteHandler[] | undefined;
    let routeIndex = 0;
    let removed = '';
    let slashAdded = false;
    let cachedUrl = '';
    let cachedPath = '';

    if (req.originalUrl === undefined) {
      req.originalUrl = req.url!;
    }
    if (req.baseUrl === undefined) {
      req.baseUrl = '';
    }
    if (req.params === undefined) {
      req.params = {};
    }
    const parentBaseUrl = req.baseUrl;

    const next: NextFunction = (err?: any) => {
      // As with Express, a falsy value is no error: callbacks commonly
      // pass on their "null" error ("cb(err => next(err))")
      if (!err || err === 'route' || err === 'router') {
        err = undefined;
      }
      if (removed) {
        if (slashAdded) {
          req.url = req.url!.slice(1);
          slashAdded = false;
        }
        req.url = removed + req.url;
        req.baseUrl = parentBaseUrl;
        removed = '';
      }
      // Continue with the next handler registered for the matched route
      if (routeHandlers !== undefined) {
        if (err === undefined && routeIndex < routeHandlers.length) {
          return invoke(routeHandlers[routeIndex++], req, res, next);
        }
        routeHandlers = undefined;
      }

      while (index < stack.length) {
        const layer = stack[index++];
        const url = req.url!;
        if (url !== cachedUrl) {
          cachedUrl = url;
          try {
            cachedPath = getRoutingPath(url);
          } catch (error) {
            // A malformed URL goes to the error handlers (400)
            cachedPath = '';
            err ??= error;
          }
        }

        if (layer.table) {
          if (err !== undefined) {
            continue;
          }
          let found;
          try {
            found = layer.table.lookup(method, cachedPath);
          } catch (error) {
            err = error;
            continue;
          }
          if (found === null) {
            continue;
          }
          req.params = found.params;
          routeHandlers = found.handlers;
          routeIndex = 1;
          return invoke(found.handlers[0], req, res, next);
        }

        if ((err !== undefined) !== layer.isErrorHandler) {
          continue;
        }
        if (
          layer.method !== undefined &&
          layer.method !== method &&
          !(method === 'HEAD' && layer.method === 'GET')
        ) {
          continue;
        }
        if (layer.matcher !== null) {
          let result;
          try {
            result = layer.matcher(cachedPath);
          } catch (error) {
            err = error;
            continue;
          }
          if (!result) {
            continue;
          }
          req.params = result.params;
          if (layer.isMount) {
            // Mounted middleware (e.g. "serve-static") sees the URL relative
            // to its mount path, as in Express. The mount path was matched
            // against the decoded routing path, so find where it ends in the
            // raw URL.
            const mountPath = result.path.endsWith('/')
              ? result.path.slice(0, -1)
              : result.path;
            const end = getRawPrefixEnd(url, mountPath);
            removed = url.slice(0, end);
            req.url = url.slice(end);
            if (req.url[0] !== '/') {
              req.url = '/' + req.url;
              slashAdded = true;
            }
            req.baseUrl = parentBaseUrl + mountPath;
          }
        }
        return invoke(layer.handler, req, res, next, err);
      }

      if (done) {
        return done(err);
      }
      this.finalHandler(err, req, res);
    };

    next();
  }
}

// Routers are functions (see the constructor), so they keep `call()`, `apply()`
// and `bind()`
Object.setPrototypeOf(NodeRouter.prototype, Function.prototype);
