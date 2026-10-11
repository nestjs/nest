import FindMyWay from 'find-my-way';
import { match, parse, type Token } from 'path-to-regexp';
import { loosen } from './utils.js';

export type RouteHandler = (
  req: any,
  res: any,
  next: (err?: any) => void,
) => any;

export interface RouteMatch {
  handlers: RouteHandler[];
  params: Record<string, any>;
  /** Registration order of each handler, see {@link RouteTable.lookupRest}. */
  seqs: number[];
}

export interface RouteEntry {
  handler: RouteHandler;
  params: Record<string, any>;
}

interface RouteRecord {
  handlers: RouteHandler[];
  seqs: number[];
  /**
   * Parameter names of the route of each handler, in path order. Routes are
   * registered in find-my-way under positional names ("p0", "p1", ...), so
   * that routes differing only by their parameter names share one record and
   * pass control to each other through `next()`, as in Express.
   */
  paramNames: string[][];
  /** Whether the last parameter is a trailing wildcard (find-my-way's `*`). */
  hasWildcard: boolean;
  /** Number of "/" in the route path before the wildcard. */
  wildcardSlashes: number;
}

interface FoundRoute {
  handlers: RouteHandler[];
  seqs: number[];
  params: Record<string, any>;
}

interface FindMyWayVariant {
  path: string;
  paramNames: string[];
  hasWildcard: boolean;
  wildcardSlashes: number;
}

// Route parameters live in an object without a prototype, as with
// find-my-way, which is cheaper to create than `Object.create(null)`
const ParamsObject = function () {} as unknown as new () => Record<string, any>;
ParamsObject.prototype = Object.create(null);

// Positional parameter names, see `RouteRecord`
const POSITIONAL_NAMES = Array.from({ length: 32 }, (_, i) => `p${i}`);

function positionalName(index: number) {
  return POSITIONAL_NAMES[index] ?? `p${index}`;
}

type Matcher = (path: string) => false | { params: Record<string, any> };

interface FallbackRoute {
  method: string | null;
  matcher: Matcher;
  handler: RouteHandler;
  seq: number;
}

/** Every route, for {@link RouteTable.lookupRest}. */
interface RegisteredRoute {
  method: string | null;
  path: string;
  /** Compiled on first use. */
  matcher?: Matcher;
  handler: RouteHandler;
  seq: number;
}

// Paths are case-sensitive everywhere, as with find-my-way's default (and
// Fastify): cheaper than lowercasing every request path, and the routes, the
// routes matched with path-to-regexp and the middleware all agree
function compileMatcher(path: string): Matcher {
  const matcher = match(loosen(path), {
    decode: decodeParam,
    end: true,
    sensitive: true,
  });
  return (pathname: string) => matcher(pathname) as any;
}

function acceptsMethod(routeMethod: string | null, method: string) {
  return (
    routeMethod === null ||
    routeMethod === method ||
    (method === 'HEAD' && routeMethod === 'GET')
  );
}

/**
 * Default longest (decoded) route parameter a route matches, as with Fastify
 * (see {@link RouteTableOptions.maxParamLength}).
 */
export const MAX_PARAM_LENGTH = 100;

export interface RouteTableOptions {
  /**
   * Longest (decoded) route parameter a route matches. A request whose
   * parameter is longer falls through to another matching route (a sibling
   * wildcard, for instance), if any; when none matches, `lookup()` returns
   * {@link PARAM_TOO_LONG} (Fastify answers those with a 414). Wildcards are
   * not limited. Defaults to {@link MAX_PARAM_LENGTH}.
   */
  maxParamLength?: number;
}

/**
 * What `lookup()` returns when no route matched, but one would have if a
 * route parameter were not longer than the `maxParamLength` option.
 */
export const PARAM_TOO_LONG: RouteMatch = Object.freeze({
  handlers: [],
  params: {},
  seqs: [],
}) as unknown as RouteMatch;

// What `find()` returns in that case (find-my-way's onMaxParamLength result)
const TOO_LONG = {} as FoundRoute;

function noop() {}

const UNSAFE_TEXT = /[*?(]/;
// find-my-way reads a parameter name up to the next "/", "-" or "."
const PARAM_NAME_END = /^[/.-]/;

function decodeParam(value: string) {
  return decodeURIComponent(value);
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// The limit find-my-way applies to the routes it matches, for the routes
// matched with path-to-regexp (wildcards are arrays there)
function exceedsMaxParamLength(params: Record<string, any>, limit: number) {
  for (const key in params) {
    const value = params[key];
    if (typeof value === 'string' && value.length > limit) {
      return true;
    }
  }
  return false;
}

/**
 * Expands the optional groups of a path-to-regexp token list into every
 * concrete variant (`/u{/:id}` gives `/u` and `/u/:id`).
 */
// Each optional group doubles the number of variants; past this many groups,
// match the route with path-to-regexp instead of expanding it
const MAX_EXPANDED_GROUPS = 6;

function countGroups(tokens: Token[]): number {
  let count = 0;
  for (const token of tokens) {
    if (token.type === 'group') {
      count += 1 + countGroups(token.tokens);
    }
  }
  return count;
}

function expandGroups(tokens: Token[]): Token[][] {
  let variants: Token[][] = [[]];
  for (const token of tokens) {
    if (token.type === 'group') {
      const groupVariants = expandGroups(token.tokens);
      const next: Token[][] = [];
      // Variants with the group come first: when two variants match the same
      // paths ("/a{/:x}{/:y}" gives "/a/:x" and "/a/:y"), the first one names
      // the parameters, and path-to-regexp fills the earlier group first
      for (const variant of variants) {
        for (const groupVariant of groupVariants) {
          next.push([...variant, ...groupVariant]);
        }
        next.push(variant);
      }
      variants = next;
    } else {
      variants = variants.map(variant => [...variant, token]);
    }
  }
  return variants;
}

/**
 * Translates one group-free variant to find-my-way's syntax. Returns
 * `undefined` when find-my-way cannot express it, in which case the route is
 * matched with path-to-regexp instead.
 */
function toFindMyWayPath(tokens: Token[]): FindMyWayVariant | undefined {
  let path = '';
  const paramNames: string[] = [];
  let hasWildcard = false;
  let wildcardSlashes = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case 'text':
        if (UNSAFE_TEXT.test(token.value)) {
          return undefined;
        }
        path += token.value.replaceAll(':', '::');
        break;
      case 'param': {
        // Anything else right after a parameter (another parameter, a
        // wildcard, "@", "~", ...) would end up in find-my-way's name for it
        const next = tokens[i + 1];
        if (
          next !== undefined &&
          (next.type !== 'text' || !PARAM_NAME_END.test(next.value))
        ) {
          return undefined;
        }
        path += `:${positionalName(paramNames.length)}`;
        paramNames.push(token.name);
        break;
      }
      case 'wildcard':
        // find-my-way only supports a trailing wildcard
        if (i !== tokens.length - 1) {
          return undefined;
        }
        wildcardSlashes = path.split('/').length - 1;
        path += '*';
        paramNames.push(token.name);
        hasWildcard = true;
        break;
      default:
        return undefined;
    }
  }
  // A variant ending with "/" ("/admin/" of "/admin/{*path}") must not match
  // "/admin", as with Express, but find-my-way's ignoreTrailingSlash would
  if (path.length > 1 && path.endsWith('/')) {
    return undefined;
  }
  return { path: path || '/', paramNames, hasWildcard, wildcardSlashes };
}

/**
 * Route table of one contiguous block of routes registered on the
 * `NodeRouter`. Paths use the path-to-regexp syntax (the same as Express),
 * and are matched through a find-my-way radix tree, so the lookup cost does
 * not grow with the number of routes. The few paths find-my-way cannot
 * express fall back to a path-to-regexp matcher.
 *
 * Several handlers may be registered for the same method and path (as Nest
 * does for host- and version-filtered routes); they run in registration order
 * and pass control to each other through `next()`.
 */
export class RouteTable {
  private readonly maxParamLength: number;
  private readonly router: FindMyWay.Instance<FindMyWay.HTTPVersion.V1>;
  private readonly allRouter: FindMyWay.Instance<FindMyWay.HTTPVersion.V1>;
  private readonly records = new Map<string, RouteRecord>();
  private readonly fallbackRoutes: FallbackRoute[] = [];
  private readonly routes: RegisteredRoute[] = [];
  private hasAllRoutes = false;
  private seq = 0;

  constructor(options: RouteTableOptions = {}) {
    this.maxParamLength = options.maxParamLength ?? MAX_PARAM_LENGTH;
    const routerOptions = {
      ignoreTrailingSlash: true,
      maxParamLength: this.maxParamLength,
      // Makes find() return a result whose store is null when nothing matched
      // because of a parameter's length (see TOO_LONG)
      onMaxParamLength: noop,
    };
    this.router = FindMyWay(routerOptions);
    this.allRouter = FindMyWay(routerOptions);
  }

  /**
   * @param method Upper-case HTTP method, or `null` for every method.
   */
  public add(method: string | null, path: string, handler: RouteHandler) {
    const seq = this.seq++;
    this.routes.push({ method, path, handler, seq });
    const { tokens } = parse(path);
    const variants =
      countGroups(tokens) > MAX_EXPANDED_GROUPS
        ? [undefined]
        : expandGroups(tokens).map(toFindMyWayPath);

    if (variants.some(variant => variant === undefined)) {
      this.fallbackRoutes.push({
        method,
        matcher: compileMatcher(path),
        handler,
        seq,
      });
      return;
    }
    // Several variants may translate to the same path ("/a{/}" for instance);
    // the first one wins
    const uniqueVariants = new Map<string, FindMyWayVariant>();
    for (const variant of variants as FindMyWayVariant[]) {
      if (!uniqueVariants.has(variant.path)) {
        uniqueVariants.set(variant.path, variant);
      }
    }
    for (const {
      path: routePath,
      paramNames,
      hasWildcard,
      wildcardSlashes,
    } of uniqueVariants.values()) {
      const router = method === null ? this.allRouter : this.router;
      const routerMethod = method ?? 'GET';
      const key = `${method} ${routePath}`;

      const record = this.records.get(key);
      if (record) {
        record.handlers.push(handler);
        record.seqs.push(seq);
        record.paramNames.push(paramNames);
        continue;
      }
      const newRecord: RouteRecord = {
        handlers: [handler],
        seqs: [seq],
        paramNames: [paramNames],
        hasWildcard,
        wildcardSlashes,
      };
      try {
        router.on(routerMethod as any, routePath, () => {}, newRecord);
      } catch {
        // Same shape as an existing route under different parameter names
        this.fallbackRoutes.push({
          method,
          matcher: compileMatcher(path),
          handler,
          seq,
        });
        return;
      }
      this.records.set(key, newRecord);
    }
    if (method === null) {
      this.hasAllRoutes = true;
    }
  }

  public lookup(method: string, path: string): RouteMatch | null {
    let exceeded = false;
    let found = this.find(this.router, method, path);
    if (found === TOO_LONG) {
      exceeded = true;
      found = null;
    }
    if (found === null && method === 'HEAD') {
      found = this.find(this.router, 'GET', path);
      if (found === TOO_LONG) {
        exceeded = true;
        found = null;
      }
    }
    if (this.hasAllRoutes) {
      const foundAll = this.find(this.allRouter, 'GET', path);
      if (foundAll === TOO_LONG) {
        exceeded = true;
      } else if (foundAll !== null) {
        found = found === null ? foundAll : this.merge(found, foundAll);
      }
    }
    if (found !== null) {
      return found;
    }
    const fallback =
      this.fallbackRoutes.length > 0 ? this.lookupFallback(method, path) : null;
    if (fallback !== null) {
      return fallback;
    }
    return exceeded ? PARAM_TOO_LONG : null;
  }

  private find(
    router: FindMyWay.Instance<FindMyWay.HTTPVersion.V1>,
    method: string,
    path: string,
  ): FoundRoute | null {
    const result = router.find(method as any, path);
    if (result === null) {
      return null;
    }
    if (result.store === null) {
      return TOO_LONG;
    }
    const record = result.store as RouteRecord;
    const values = result.params as Record<string, string>;
    for (const key in values) {
      // path-to-regexp (the middleware matcher, and Express) requires at
      // least one character per parameter; find-my-way also accepts an empty
      // one ("/users//profile"). Treat that as no match, or the route could
      // run without the middleware guarding it.
      if (key !== '*' && values[key] === '') {
        return null;
      }
    }
    let wildcard: string[] | undefined;
    if (record.hasWildcard) {
      // Split before decoding, as path-to-regexp does, so that an encoded "/"
      // ("%2F") stays within its segment
      let start = 0;
      for (let i = 0; i < record.wildcardSlashes; i++) {
        const slash = path.indexOf('/', start);
        if (slash === -1) {
          return null;
        }
        start = slash + 1;
      }
      let end = path.length;
      if (end > start && path.charCodeAt(end - 1) === 47 /* / */) {
        end -= 1;
      }
      // path-to-regexp wildcards match one or more characters
      if (start === 0 || end <= start) {
        return null;
      }
      wildcard = path.slice(start, end).split('/').map(decodeSegment);
    }
    // Every handler sees the parameters under the names its route uses
    const params = new ParamsObject();
    for (const names of record.paramNames) {
      const last = names.length - 1;
      for (let i = 0; i <= last; i++) {
        params[names[i]] =
          wildcard !== undefined && i === last
            ? wildcard
            : values[positionalName(i)];
      }
    }
    return { handlers: record.handlers, seqs: record.seqs, params };
  }

  private merge(left: FoundRoute, right: FoundRoute): FoundRoute {
    const entries = [
      ...left.handlers.map((handler, i) => ({ handler, seq: left.seqs[i] })),
      ...right.handlers.map((handler, i) => ({ handler, seq: right.seqs[i] })),
    ].sort((a, b) => a.seq - b.seq);
    return {
      handlers: entries.map(entry => entry.handler),
      seqs: entries.map(entry => entry.seq),
      params: { ...right.params, ...left.params },
    };
  }

  /**
   * The first route matched with path-to-regexp (see `lookupRest()` for the
   * others).
   */
  private lookupFallback(method: string, path: string): RouteMatch | null {
    let exceeded = false;
    for (const route of this.fallbackRoutes) {
      if (!acceptsMethod(route.method, method)) {
        continue;
      }
      const result = route.matcher(path);
      if (!result) {
        continue;
      }
      if (exceedsMaxParamLength(result.params, this.maxParamLength)) {
        exceeded = true;
        continue;
      }
      return {
        handlers: [route.handler],
        seqs: [route.seq],
        params: result.params,
      };
    }
    return exceeded ? PARAM_TOO_LONG : null;
  }

  /**
   * Every other route matching `path`, in registration order, each with its
   * own parameters: where control goes once the handlers `lookup()` returned
   * have all called `next()`, as when a host- or version-filtered handler
   * does not apply. Express would try the same routes. Only runs then, so it
   * compiles the path-to-regexp matchers lazily.
   *
   * @param exclude Registration order of the handlers that already ran.
   */
  public lookupRest(
    method: string,
    path: string,
    exclude: number[],
  ): RouteEntry[] {
    const entries: RouteEntry[] = [];
    for (const route of this.routes) {
      if (exclude.includes(route.seq) || !acceptsMethod(route.method, method)) {
        continue;
      }
      route.matcher ??= compileMatcher(route.path);
      const result = route.matcher(path);
      if (
        !result ||
        exceedsMaxParamLength(result.params, this.maxParamLength)
      ) {
        continue;
      }
      entries.push({ handler: route.handler, params: result.params });
    }
    return entries;
  }
}
