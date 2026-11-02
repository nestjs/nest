import type { IncomingMessage, ServerResponse } from 'http';
import { match } from 'path-to-regexp';
import { NodeRequest, NodeResponse } from '../adapters/node-request.js';
import {
  PARAM_TOO_LONG,
  type RouteEntry,
  type RouteHandler,
  type RouteMatch,
  type RouteTableOptions,
  RouteTable,
} from './route-table.js';
import {
  getCommonPrefix,
  getLiteralPrefix,
  getPrefixSkips,
  getRawPrefixEnd,
  getRoutingPath,
  loosen,
} from './utils.js';

type NextFunction = (err?: any) => void;
type PathMatcher = (path: string) => false | { path: string; params: any };

interface MiddlewareLayer {
  table?: undefined;
  /** `null` matches every path. */
  matcher: PathMatcher | null;
  /** What every path `matcher` matches starts with, see `getLiteralPrefix()`. */
  prefix: string;
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

/**
 * The mount paths a `use()` call starts with: a path, or a list of paths as
 * Express accepts (`use(['/css', '/js'], serveStatic(...))`), each of which
 * may itself be a list matched as one path; `undefined` when it starts with
 * the middleware.
 */
function getMountPaths(value: unknown): (string | string[])[] | undefined {
  if (typeof value === 'string') {
    return [value];
  }
  if (
    !Array.isArray(value) ||
    !value.flat(Infinity).every(path => typeof path === 'string')
  ) {
    return undefined;
  }
  return value.map(path =>
    Array.isArray(path) ? (path.flat(Infinity) as string[]) : path,
  );
}

function decodeParam(value: string) {
  // decodeURIComponent() is a call into the runtime (about 80 ns), even for a
  // value without any "%" to decode
  return value.indexOf('%') === -1 ? value : decodeURIComponent(value);
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

export interface NodeRouterOptions {
  /**
   * Longest (decoded) route parameter a route matches; `100` by default, as
   * with Fastify. A request whose parameter is longer falls through to
   * another matching route (a sibling wildcard, for instance), if any, or
   * gets a 414. Wildcards are not limited.
   */
  maxParamLength?: number;
}

/**
 * Set on a request that no route matched only because a route parameter was
 * longer than `maxParamLength`; turned into a 414 where the request would
 * otherwise get a 404 (see {@link createUriTooLongError}).
 *
 * @internal
 */
export const PARAM_TOO_LONG_KEY = Symbol('nestjs.node.paramTooLong');

/**
 * The 414 for a request flagged with {@link PARAM_TOO_LONG_KEY}, shaped like
 * an http-errors error, so that Nest's exception filter answers it with its
 * status and message.
 *
 * @internal
 */
// Where handleError() resumes for a request: the layer after the error
// handler that ran last (set on the error path only)
const ERROR_RESUME_KEY = Symbol('nestjs.node.errorResume');

export function createUriTooLongError() {
  return Object.assign(new Error('Route parameter too long'), {
    status: 414,
    statusCode: 414,
    expose: true,
  });
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
  /** See `getPrefixSkips()`; computed on first use after a layer is added. */
  declare private skips: number[] | undefined;
  declare private finalHandler: FinalHandler;
  declare private routeTableOptions: RouteTableOptions;
  /**
   * Called for a request whose target cannot be routed (a malformed URL,
   * answered with a 400), before the error-handling middleware: no other
   * middleware runs for such a request.
   */
  declare public onRejectedTarget:
    ((req: NodeRequest, res: NodeResponse) => void) | undefined;
  /**
   * Prototype given to a request of another server, which is not a
   * `NodeRequest` (`NodeRequest.prototype` by default): the `NodeAdapter`
   * sets that of its request class, so that its options apply there too.
   *
   * @internal
   */
  declare public requestPrototype: NodeRequest | undefined;

  constructor(finalHandler: FinalHandler, options: NodeRouterOptions = {}) {
    const { maxParamLength } = options;
    if (
      maxParamLength !== undefined &&
      (typeof maxParamLength !== 'number' || !(maxParamLength >= 1))
    ) {
      throw new TypeError(
        `Invalid maxParamLength: ${String(maxParamLength)} (expected a number greater than 0)`,
      );
    }
    const router = ((
      req: IncomingMessage,
      res: ServerResponse,
      done?: NextFunction,
    ) => router.handle(req, res, done)) as NodeRouter;
    Object.setPrototypeOf(router, new.target.prototype);
    router.stack = [];
    router.skips = undefined;
    router.finalHandler = finalHandler;
    router.routeTableOptions = { maxParamLength };
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
      Object.setPrototypeOf(
        req,
        this.requestPrototype ?? NodeRequest.prototype,
      );
    }
    if (!(res instanceof NodeResponse)) {
      Object.setPrototypeOf(res, NodeResponse.prototype);
    }
    this.dispatch(req as NodeRequest, res as NodeResponse, done);
  }

  /**
   * Runs the error-handling middleware (then the final handler) for an error
   * raised outside of the middleware chain, such as by `res.sendFile()` once
   * the route handler returned. Express passes those to the `next()` it
   * stores on every request.
   */
  public handleError(err: unknown, req: NodeRequest, res: NodeResponse) {
    // An error raised by an error handler itself (an exception filter whose
    // res.sendFile() fails as well) continues past that handler, as with
    // Express' next(): starting over would run it again, without end
    this.dispatch(req, res, undefined, err, (req as any)[ERROR_RESUME_KEY]);
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
    const paths = getMountPaths(args[0]);
    const handlers = paths ? args.slice(1) : args;
    // Only the string "/" (or "") mounts at the root: as with Express, ["/"]
    // matches "/" alone
    const isRoot = !paths || args[0] === '/' || args[0] === '';
    const matchers = isRoot
      ? []
      : paths.map(
          path =>
            match(Array.isArray(path) ? path.map(loosen) : loosen(path), {
              decode: decodeParam,
              end: false,
              // Case-sensitive, as routes are (see RouteTable)
              sensitive: true,
            }) as PathMatcher,
        );
    // With several paths, the first one that matches is the mount path and
    // the middleware runs once, as with Express
    const matcher: PathMatcher | null = isRoot
      ? null
      : matchers.length === 1
        ? matchers[0]
        : path => {
            for (const pathMatcher of matchers) {
              const result = pathMatcher(path);
              if (result) {
                return result;
              }
            }
            return false;
          };
    const prefix = isRoot
      ? ''
      : getCommonPrefix(
          paths.map(path =>
            Array.isArray(path)
              ? // An empty list matches every path: no prefix
                getCommonPrefix(path.map(p => getLiteralPrefix(loosen(p))))
              : getLiteralPrefix(loosen(path)),
          ),
        );

    for (const handler of handlers.flat()) {
      if (typeof handler !== 'function') {
        throw new TypeError(
          `NodeRouter.use() requires a middleware function, received ${typeof handler}`,
        );
      }
      this.skips = undefined;
      this.stack.push({
        matcher,
        prefix,
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
      last = { table: new RouteTable(this.routeTableOptions) };
      this.skips = undefined;
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
    this.skips = undefined;
    this.stack.push({
      matcher: match(loosen(path), {
        decode: decodeParam,
        end: true,
        sensitive: true,
      }) as PathMatcher,
      prefix: getLiteralPrefix(loosen(path)),
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

  // Nest registers a middleware bound to a controller once per route path
  // (see createMiddlewareFactory()): without skipping, every request would
  // run the matcher of each one
  private getSkips() {
    return (this.skips ??= getPrefixSkips(
      this.stack.map(layer =>
        layer.table || layer.matcher === null ? undefined : layer.prefix,
      ),
    ));
  }

  private dispatch(
    req: NodeRequest,
    res: NodeResponse,
    done: NextFunction | undefined,
    initialError?: unknown,
    startIndex = 0,
  ) {
    const stack = this.stack;
    let index = startIndex;
    let routeMatch: RouteMatch | undefined;
    let routeIndex = 0;
    // The other routes matching the path, once every handler of the matched
    // route passed (see RouteTable.lookupRest)
    let restEntries: RouteEntry[] | undefined;
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
      if (routeMatch !== undefined) {
        if (err === undefined) {
          if (routeIndex < routeMatch.handlers.length) {
            return invoke(routeMatch.handlers[routeIndex++], req, res, next);
          }
          // Every handler passed: on to the other routes matching the path,
          // as when a version- or host-filtered handler does not apply. The
          // route's table is the layer just before "index".
          restEntries ??= stack[index - 1].table!.lookupRest(
            req.method!,
            cachedPath,
            routeMatch.seqs,
          );
          const entry = restEntries.shift();
          if (entry !== undefined) {
            req.params = entry.params;
            return invoke(entry.handler, req, res, next);
          }
        }
        routeMatch = undefined;
        restEntries = undefined;
      }

      while (index < stack.length) {
        const layer = stack[index++];
        const url = req.url!;
        // Read for every layer, as in Express, so that middleware such as
        // "method-override" can change the method routes are matched with
        const method = req.method!;
        if (url !== cachedUrl) {
          cachedUrl = url;
          try {
            cachedPath = getRoutingPath(url);
          } catch (error) {
            // A malformed URL goes to the error handlers (400)
            cachedPath = '';
            if (err === undefined) {
              this.onRejectedTarget?.(req, res);
            }
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
          if (found === PARAM_TOO_LONG) {
            (req as any)[PARAM_TOO_LONG_KEY] = true;
            continue;
          }
          req.params = found.params;
          routeMatch = found;
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
          // When the path does not start with the prefix of a layer that the
          // next ones share (e.g. the first one registered for a controller),
          // skip them all; for a single layer, its matcher is as cheap
          const skip = this.getSkips()[index - 1];
          if (skip > index && !cachedPath.startsWith(layer.prefix)) {
            index = skip;
            continue;
          }
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
        if (err !== undefined) {
          (req as any)[ERROR_RESUME_KEY] = index;
        }
        return invoke(layer.handler, req, res, next, err);
      }

      if (done) {
        return done(err);
      }
      this.finalHandler(
        err === undefined && (req as any)[PARAM_TOO_LONG_KEY]
          ? createUriTooLongError()
          : err,
        req,
        res,
      );
    };

    next(initialError);
  }
}

// Routers are functions (see the constructor), so they keep `call()`, `apply()`
// and `bind()`
Object.setPrototypeOf(NodeRouter.prototype, Function.prototype);
