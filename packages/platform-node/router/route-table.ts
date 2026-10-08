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

interface FallbackRoute {
  method: string | null;
  matcher: (path: string) => false | { params: Record<string, any> };
  handler: RouteHandler;
  seq: number;
}

/**
 * Longest (decoded) route parameter a route matches, as with Fastify: a
 * request whose parameter is longer falls through to the next matching route,
 * if any, or gets a 404. Wildcards are not limited.
 */
export const MAX_PARAM_LENGTH = 100;

const ROUTER_OPTIONS = {
  ignoreTrailingSlash: true,
  maxParamLength: MAX_PARAM_LENGTH,
};

const UNSAFE_TEXT = /[*?(]/;
// find-my-way reads a parameter name up to the next "/", "-" or "."
const PARAM_NAME_END = /^[/.-]/;

function decodeParam(value: string) {
  return decodeURIComponent(value);
}

// The limit find-my-way applies to the routes it matches, for the routes
// matched with path-to-regexp (wildcards are arrays there)
function exceedsMaxParamLength(params: Record<string, any>) {
  for (const key in params) {
    const value = params[key];
    if (typeof value === 'string' && value.length > MAX_PARAM_LENGTH) {
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
        path += '*';
        paramNames.push(token.name);
        hasWildcard = true;
        break;
      default:
        return undefined;
    }
  }
  return { path: path || '/', paramNames, hasWildcard };
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
  private readonly router = FindMyWay(ROUTER_OPTIONS);
  private readonly allRouter = FindMyWay(ROUTER_OPTIONS);
  private readonly records = new Map<string, RouteRecord>();
  private readonly fallbackRoutes: FallbackRoute[] = [];
  private hasAllRoutes = false;
  private seq = 0;

  /**
   * @param method Upper-case HTTP method, or `null` for every method.
   */
  public add(method: string | null, path: string, handler: RouteHandler) {
    const seq = this.seq++;
    const { tokens } = parse(path);
    const variants =
      countGroups(tokens) > MAX_EXPANDED_GROUPS
        ? [undefined]
        : expandGroups(tokens).map(toFindMyWayPath);

    if (variants.some(variant => variant === undefined)) {
      const matcher = match(loosen(path), { decode: decodeParam, end: true });
      this.fallbackRoutes.push({
        method,
        matcher: (pathname: string) => matcher(pathname) as any,
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
      };
      try {
        router.on(routerMethod as any, routePath, () => {}, newRecord);
      } catch {
        // Same shape as an existing route under different parameter names
        const matcher = match(loosen(path), { decode: decodeParam, end: true });
        this.fallbackRoutes.push({
          method,
          matcher: (pathname: string) => matcher(pathname) as any,
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
    let found = this.find(this.router, method, path);
    if (found === null && method === 'HEAD') {
      found = this.find(this.router, 'GET', path);
    }
    if (this.hasAllRoutes) {
      const foundAll = this.find(this.allRouter, 'GET', path);
      if (foundAll !== null) {
        found = found === null ? foundAll : this.merge(found, foundAll);
      }
    }
    if (found !== null) {
      return { handlers: found.handlers, params: found.params };
    }
    return this.fallbackRoutes.length > 0
      ? this.lookupFallback(method, path)
      : null;
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
      const value = values['*'];
      // path-to-regexp wildcards match one or more characters
      if (!value) {
        return null;
      }
      wildcard = value.split('/');
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

  private lookupFallback(method: string, path: string): RouteMatch | null {
    // Every matching route, in registration order, so that host- and
    // version-filtered handlers can pass control to each other
    let found: RouteMatch | null = null;
    for (const route of this.fallbackRoutes) {
      if (
        route.method !== null &&
        route.method !== method &&
        !(method === 'HEAD' && route.method === 'GET')
      ) {
        continue;
      }
      const result = route.matcher(path);
      if (!result || exceedsMaxParamLength(result.params)) {
        continue;
      }
      if (found === null) {
        found = { handlers: [route.handler], params: result.params };
      } else {
        found.handlers.push(route.handler);
      }
    }
    return found;
  }
}
