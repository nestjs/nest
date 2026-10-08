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
  /** Name of the trailing wildcard, translated from find-my-way's `*`. */
  wildcard?: string;
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

const PARAM_NAME = /^[A-Za-z_$][\w$]*$/;
const UNSAFE_TEXT = /[*?(]/;

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
      for (const variant of variants) {
        next.push(variant);
        for (const groupVariant of groupVariants) {
          next.push([...variant, ...groupVariant]);
        }
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
function toFindMyWayPath(
  tokens: Token[],
): { path: string; wildcard?: string } | undefined {
  let path = '';
  let wildcard: string | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case 'text':
        if (UNSAFE_TEXT.test(token.value)) {
          return undefined;
        }
        path += token.value.replaceAll(':', '::');
        break;
      case 'param':
        if (!PARAM_NAME.test(token.name)) {
          return undefined;
        }
        // Two adjacent parameters cannot be told apart by find-my-way
        if (tokens[i + 1]?.type === 'param') {
          return undefined;
        }
        path += `:${token.name}`;
        break;
      case 'wildcard':
        // find-my-way only supports a trailing wildcard
        if (i !== tokens.length - 1) {
          return undefined;
        }
        path += '*';
        wildcard = token.name;
        break;
      default:
        return undefined;
    }
  }
  return { path: path || '/', wildcard };
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
    // Several variants may translate to the same path ("/a{/}" for instance)
    const uniqueVariants = new Map(
      variants.map(variant => [variant!.path, variant!]),
    );
    for (const { path: routePath, wildcard } of uniqueVariants.values()) {
      const router = method === null ? this.allRouter : this.router;
      const routerMethod = method ?? 'GET';
      const key = `${method} ${routePath}`;

      const record = this.records.get(key);
      if (record) {
        record.handlers.push(handler);
        record.seqs.push(seq);
        continue;
      }
      const newRecord: RouteRecord = {
        handlers: [handler],
        seqs: [seq],
        wildcard,
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
      return { handlers: found.record.handlers, params: found.params };
    }
    return this.fallbackRoutes.length > 0
      ? this.lookupFallback(method, path)
      : null;
  }

  private find(
    router: FindMyWay.Instance<FindMyWay.HTTPVersion.V1>,
    method: string,
    path: string,
  ): { record: RouteRecord; params: Record<string, any> } | null {
    const result = router.find(method as any, path);
    if (result === null) {
      return null;
    }
    const record = result.store as RouteRecord;
    const params = result.params as Record<string, any>;
    for (const key in params) {
      // path-to-regexp (the middleware matcher, and Express) requires at
      // least one character per parameter; find-my-way also accepts an empty
      // one ("/users//profile"). Treat that as no match, or the route could
      // run without the middleware guarding it.
      if (key !== '*' && params[key] === '') {
        return null;
      }
    }
    if (record.wildcard !== undefined) {
      const value = params['*'];
      // path-to-regexp wildcards match one or more characters
      if (!value) {
        return null;
      }
      delete params['*'];
      params[record.wildcard] = value.split('/');
    }
    return { record, params };
  }

  private merge(
    left: { record: RouteRecord; params: Record<string, any> },
    right: { record: RouteRecord; params: Record<string, any> },
  ) {
    const entries = [
      ...left.record.handlers.map((handler, i) => ({
        handler,
        seq: left.record.seqs[i],
      })),
      ...right.record.handlers.map((handler, i) => ({
        handler,
        seq: right.record.seqs[i],
      })),
    ].sort((a, b) => a.seq - b.seq);
    return {
      record: {
        handlers: entries.map(entry => entry.handler),
        seqs: entries.map(entry => entry.seq),
      },
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
