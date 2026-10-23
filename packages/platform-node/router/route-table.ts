import FindMyWay from 'find-my-way';
import { METHODS } from 'http';
import { match, parse, TokenData, type Token } from 'path-to-regexp';
import { getLiteralPrefix, getPrefixSkips, loosen } from './utils.js';

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
  /** Length of the text before the wildcard in its segment ("v-*rest"). */
  wildcardOffset: number;
  /** Every route of a HEAD record, see `RouteTable.addToRecord()`. */
  entries?: RecordEntry[];
  /**
   * For each handler, the path-to-regexp matcher of its route when it has
   * variants ending with "/" (see `RouteTable.add()`).
   */
  pathMatchers: (Matcher | undefined)[];
  hasPathMatchers: boolean;
}

interface RecordEntry {
  handler: RouteHandler;
  seq: number;
  paramNames: string[];
  pathMatcher: Matcher | undefined;
  /** Upper-case method of the route, `null` for every method. */
  method: string | null;
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
  wildcardOffset: number;
  /** Ends with "/", see `toFindMyWayPath()`. */
  trailingSlash: boolean;
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
  /** Also in find-my-way, but for its variants ending with "/". */
  partial?: boolean;
  /**
   * For a partial route, matches its variants ending with "/" alone ("/files/"
   * of "/files/{*path}"), see `RouteTable.lookup()`.
   */
  variantMatcher?: Matcher;
}

/** Every route, for {@link RouteTable.lookupRest}. */
interface RegisteredRoute {
  method: string | null;
  path: string;
  /** Compiled on first use. */
  matcher?: Matcher;
  /** What every path the route matches starts with. */
  prefix: string;
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

// Matches the given group-free variants exactly, trailing "/" included
function compileVariantMatcher(variants: Token[][]): Matcher {
  const matcher = match(
    variants.map(tokens => new TokenData(tokens)),
    { end: true, sensitive: true, trailing: false },
  );
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
// What `find()` returns when path-to-regexp does not match what find-my-way
// did, as for an empty parameter (see `lookup()`)
const EMPTY_PARAM = {} as FoundRoute;

function noop() {}

const GET_AND_HEAD = ['GET', 'HEAD'];

const UNSAFE_TEXT = /[*?(]/;
// find-my-way reads a parameter name up to the next "/", "-" or "."
const PARAM_NAME_END = /^[/.-]/;

function decodeParam(value: string) {
  // See decodeParam() in node-router.ts
  return value.indexOf('%') === -1 ? value : decodeURIComponent(value);
}

function decodeSegment(value: string) {
  if (value.indexOf('%') === -1) {
    return value;
  }
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
  // Text since the last "/", and whether a parameter is in that segment
  let segmentText = 0;
  let segmentHasParam = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case 'text': {
        if (UNSAFE_TEXT.test(token.value)) {
          return undefined;
        }
        path += token.value.replaceAll(':', '::');
        const slash = token.value.lastIndexOf('/');
        if (slash === -1) {
          segmentText += token.value.length;
        } else {
          segmentText = token.value.length - slash - 1;
          segmentHasParam = false;
        }
        break;
      }
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
        segmentHasParam = true;
        break;
      }
      case 'wildcard':
        // find-my-way only supports a trailing wildcard. After a parameter
        // in its segment ("/:id-*rest"), where it starts varies.
        if (i !== tokens.length - 1 || segmentHasParam) {
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
  const trailingSlash = path.length > 1 && path.endsWith('/');
  return {
    path: path || '/',
    paramNames,
    hasWildcard,
    wildcardSlashes,
    wildcardOffset: hasWildcard ? segmentText : 0,
    trailingSlash,
  };
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
  private readonly records = new Map<string, RouteRecord>();
  private readonly fallbackRoutes: FallbackRoute[] = [];
  private readonly routes: RegisteredRoute[] = [];
  /** See `getPrefixSkips()`, for `lookupFirst()` and `lookupRest()`. */
  private routeSkips: number[] | undefined;
  private seq = 0;
  private hasPartialRoutes = false;

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
  }

  /**
   * @param method Upper-case HTTP method, or `null` for every method.
   */
  public add(method: string | null, path: string, handler: RouteHandler) {
    const seq = this.seq++;
    this.routes.push({
      method,
      path,
      prefix: getLiteralPrefix(loosen(path)),
      handler,
      seq,
    });
    this.routeSkips = undefined;
    const { tokens } = parse(path);
    const expanded =
      countGroups(tokens) > MAX_EXPANDED_GROUPS
        ? undefined
        : expandGroups(tokens);
    const variants = expanded?.map(toFindMyWayPath) ?? [undefined];

    if (
      variants.some(variant => variant === undefined) ||
      variants.every(variant => variant!.trailingSlash)
    ) {
      this.fallbackRoutes.push({
        method,
        matcher: compileMatcher(path),
        handler,
        seq,
      });
      return;
    }
    // The variants ending with "/" ("/admin/" of "/admin/{*path}") stay out
    // of find-my-way, and the route is matched with path-to-regexp for the
    // paths ending with "/". The other variants ("/admin/*") go in the tree,
    // where the most specific route wins, as for any other route.
    let pathMatcher: Matcher | undefined;
    if (variants.some(variant => variant!.trailingSlash)) {
      pathMatcher = compileMatcher(path);
      this.fallbackRoutes.push({
        method,
        matcher: pathMatcher,
        handler,
        seq,
        partial: true,
        variantMatcher: compileVariantMatcher(
          expanded!.filter((_, i) => variants[i]!.trailingSlash),
        ),
      });
      this.hasPartialRoutes = true;
    }
    // Several variants may translate to the same path ("/a{/}" for instance);
    // the first one wins
    const uniqueVariants = new Map<string, FindMyWayVariant>();
    for (const variant of variants as FindMyWayVariant[]) {
      if (!variant.trailingSlash && !uniqueVariants.has(variant.path)) {
        uniqueVariants.set(variant.path, variant);
      }
    }
    // One tree per method, which also holds the routes for every method and,
    // for HEAD, the GET routes: find-my-way then picks the most specific of
    // all the routes that can serve the request, whatever their method
    const treeMethods =
      method === null ? METHODS : method === 'GET' ? GET_AND_HEAD : [method];
    for (const variant of uniqueVariants.values()) {
      for (const treeMethod of treeMethods) {
        if (
          !this.addToRecord(
            treeMethod,
            variant,
            method,
            handler,
            seq,
            pathMatcher,
          )
        ) {
          // Same shape as an existing route under different parameter names
          this.fallbackRoutes.push({
            method,
            matcher: compileMatcher(path),
            handler,
            seq,
          });
          return;
        }
      }
    }
  }

  private addToRecord(
    treeMethod: string,
    variant: FindMyWayVariant,
    method: string | null,
    handler: RouteHandler,
    seq: number,
    pathMatcher: Matcher | undefined,
  ): boolean {
    const {
      path: routePath,
      paramNames,
      hasWildcard,
      wildcardSlashes,
      wildcardOffset,
    } = variant;
    const key = `${treeMethod} ${routePath}`;
    let record = this.records.get(key);
    if (!record) {
      record = {
        handlers: [],
        seqs: [],
        paramNames: [],
        hasWildcard,
        wildcardSlashes,
        wildcardOffset,
        pathMatchers: [],
        hasPathMatchers: false,
      };
      try {
        this.router.on(treeMethod as any, routePath, noop, record);
      } catch {
        return false;
      }
      this.records.set(key, record);
    }
    record.hasPathMatchers ||= pathMatcher !== undefined;
    if (treeMethod !== 'HEAD') {
      record.handlers.push(handler);
      record.seqs.push(seq);
      record.paramNames.push(paramNames);
      record.pathMatchers.push(pathMatcher);
      return true;
    }
    // A HEAD route takes precedence over the GET routes of the same path,
    // which then only run through lookupRest()
    const entries = (record.entries ??= []);
    entries.push({ handler, seq, paramNames, pathMatcher, method });
    const hasHead = entries.some(entry => entry.method === 'HEAD');
    const active = hasHead
      ? entries.filter(entry => entry.method !== 'GET')
      : entries;
    record.handlers = active.map(entry => entry.handler);
    record.seqs = active.map(entry => entry.seq);
    record.paramNames = active.map(entry => entry.paramNames);
    record.pathMatchers = active.map(entry => entry.pathMatcher);
    return true;
  }

  public lookup(method: string, path: string): RouteMatch | null {
    // find-my-way reads the first character as the leading "/" ("*admin"
    // gets the "/admin" route), while no middleware path matches such a
    // target. Express never routes a path that does not start with "/".
    if (path.charCodeAt(0) !== 47 /* / */) {
      return null;
    }
    let exceeded = false;
    let found = this.find(this.router, method, path);
    if (found === TOO_LONG) {
      exceeded = true;
      found = null;
    }
    if (found === EMPTY_PARAM) {
      // find-my-way does not look past the most specific route, while another
      // one may match ("/ext/.b" is "/ext/:file", not "/ext/:file.:ext")
      return this.lookupFirst(method, path);
    }
    if (found !== null) {
      // find-my-way serves "/admin/" with a route for "/admin" (or a
      // catch-all), while it may be for the variant ending with "/" of a route
      // registered before ("/admin/{*path}"), as Express would match it. Any
      // other path ending with "/" goes to the route it would without it.
      if (
        this.hasPartialRoutes &&
        path.length > 1 &&
        path.charCodeAt(path.length - 1) === 47 /* / */
      ) {
        const partial = this.lookupFallback(method, path, found.seqs[0]);
        if (partial !== null && partial !== PARAM_TOO_LONG) {
          return partial;
        }
      }
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
        return EMPTY_PARAM;
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
          return EMPTY_PARAM;
        }
        start = slash + 1;
      }
      // Past the text before the wildcard in its segment, which find-my-way
      // matched ("v-" of "/files/v-*rest")
      start += record.wildcardOffset;
      let end = path.length;
      if (end > start && path.charCodeAt(end - 1) === 47 /* / */) {
        end -= 1;
      }
      // path-to-regexp wildcards match one or more characters
      if (start === 0 || end <= start) {
        return EMPTY_PARAM;
      }
      wildcard = path.slice(start, end).split('/').map(decodeSegment);
    }
    // Every handler sees the parameters under the names its route uses
    const params = new ParamsObject();
    // find-my-way matched "/admin/x/" with the variant of "/admin/{*path}"
    // without the "/", path-to-regexp gives the route's own parameters
    const usePathMatchers =
      record.hasPathMatchers &&
      path.length > 1 &&
      path.charCodeAt(path.length - 1) === 47; /* / */
    for (let h = 0; h < record.paramNames.length; h++) {
      const pathMatcher = usePathMatchers ? record.pathMatchers[h] : undefined;
      if (pathMatcher !== undefined) {
        const result = pathMatcher(path);
        if (!result) {
          return EMPTY_PARAM;
        }
        Object.assign(params, result.params);
        continue;
      }
      const names = record.paramNames[h];
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

  // The first route path-to-regexp matches, in registration order, as Express
  // would pick it (see `lookup()`)
  private lookupFirst(method: string, path: string): RouteMatch | null {
    let exceeded = false;
    const routes = this.routes;
    const skips = this.getRouteSkips();
    for (let i = 0; i < routes.length;) {
      const route = routes[i];
      const skip = skips[i++];
      if (!acceptsMethod(route.method, method)) {
        continue;
      }
      if (skip > i && !path.startsWith(route.prefix)) {
        i = skip;
        continue;
      }
      route.matcher ??= compileMatcher(route.path);
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
   * The first route matched with path-to-regexp (see `lookupRest()` for the
   * others).
   */
  private lookupFallback(
    method: string,
    path: string,
    // Only the partial routes registered before this one
    beforeSeq?: number,
  ): RouteMatch | null {
    let exceeded = false;
    for (const route of this.fallbackRoutes) {
      if (beforeSeq !== undefined) {
        if (route.seq >= beforeSeq) {
          break;
        }
        // Only for its variants ending with "/" themselves: "/files/{*path}"
        // takes "/files/", but not "/files/readme/" from "/files/readme"
        if (!route.partial || !route.variantMatcher!(path)) {
          continue;
        }
      }
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

  // A version or host mismatch on a route of a large table, or a parameter
  // left empty, would otherwise run the matcher of every route
  private getRouteSkips() {
    return (this.routeSkips ??= getPrefixSkips(
      this.routes.map(route => route.prefix),
    ));
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
    const routes = this.routes;
    const skips = this.getRouteSkips();
    for (let i = 0; i < routes.length;) {
      const route = routes[i];
      const skip = skips[i++];
      if (exclude.includes(route.seq) || !acceptsMethod(route.method, method)) {
        continue;
      }
      if (skip > i && !path.startsWith(route.prefix)) {
        i = skip;
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
