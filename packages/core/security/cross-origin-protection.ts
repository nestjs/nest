import {
  type CsrfProtectionOptions,
  type HttpServer,
  ForbiddenException,
  RequestMethod,
} from '@nestjs/common';
import {
  type RouteInfo,
  addLeadingSlash,
  isFunction,
  isPlainObject,
  isString,
} from '@nestjs/common/internal';
import type { IncomingHttpHeaders } from 'http';
import { pathToRegexp } from 'path-to-regexp';
import type { RouteInfoPathExtractor } from '../middleware/route-info-path-extractor.js';
import type { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface.js';
import { LegacyRouteConverter } from '../router/legacy-route-converter.js';
import { isRouteExcluded } from '../router/utils/index.js';

/**
 * The request facts the cross-origin decision depends on.
 */
export interface CrossOriginRequestInfo {
  /** Request method, e.g. `POST`. */
  method: string;
  /** Value of the `Sec-Fetch-Site` request header, if any. */
  secFetchSite?: string;
  /** Value of the `Origin` request header, if any. */
  origin?: string;
  /** The request authority: `:authority` on HTTP/2, `Host` otherwise. */
  host?: string;
}

export type CrossOriginAllowedReason =
  | 'safe-method'
  | 'same-origin'
  | 'origin-matches-host'
  | 'no-browser-headers'
  | 'trusted-origin'
  | 'excluded';

export type CrossOriginDeniedReason =
  'cross-origin-sec-fetch-site' | 'cross-origin-origin-header';

export type CrossOriginDecision =
  | { allowed: true; reason: CrossOriginAllowedReason }
  | { allowed: false; reason: CrossOriginDeniedReason };

export interface CrossOriginExemptions {
  /** Normalized trusted origins (see {@link normalizeTrustedOrigin}). */
  trustedOrigins?: ReadonlySet<string>;
  /**
   * Evaluated lazily, only when the request would otherwise be rejected
   * (mirroring Go, where bypass patterns are consulted on the reject path).
   */
  isExcluded?: () => boolean;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

/**
 * Decides whether a request may proceed, following Go's
 * `net/http.CrossOriginProtection.Check`:
 *
 * 1. `GET`, `HEAD` and `OPTIONS` are always allowed (they must not change
 *    state). Methods are compared case-sensitively, as HTTP defines them.
 * 2. When `Sec-Fetch-Site` is present, `same-origin` and `none` (a
 *    user-initiated navigation such as a bookmark) are allowed. Any other
 *    value (`same-site`, `cross-site`, or anything unexpected) is rejected
 *    unless the request is exempt.
 * 3. Without `Sec-Fetch-Site`, a request without `Origin` is allowed: it comes
 *    from a non-browser client, or from a browser that sends neither header
 *    for same-origin requests.
 * 4. Otherwise the host of `Origin` is compared with the request authority,
 *    case-insensitively, and ignoring the default port of the `Origin` scheme
 *    (`https://a.example` matches `a.example:443`). A match is allowed (the
 *    scheme is not known, so an HTTP to HTTPS request fails open, as in Go;
 *    HSTS mitigates that). A mismatch is rejected unless the request is
 *    exempt.
 *
 * A request is exempt when it matches an exclusion or when its `Origin` is
 * one of the trusted origins.
 */
export function evaluateCrossOriginRequest(
  request: CrossOriginRequestInfo,
  exemptions: CrossOriginExemptions = {},
): CrossOriginDecision {
  if (SAFE_METHODS.has(request.method)) {
    return { allowed: true, reason: 'safe-method' };
  }

  const secFetchSite = request.secFetchSite;
  if (secFetchSite) {
    if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
      return { allowed: true, reason: 'same-origin' };
    }
    return exemptOr(request, exemptions, 'cross-origin-sec-fetch-site');
  }

  const origin = request.origin;
  if (!origin) {
    return { allowed: true, reason: 'no-browser-headers' };
  }
  if (request.host !== undefined && originMatchesHost(origin, request.host)) {
    return { allowed: true, reason: 'origin-matches-host' };
  }
  return exemptOr(request, exemptions, 'cross-origin-origin-header');
}

function exemptOr(
  request: CrossOriginRequestInfo,
  exemptions: CrossOriginExemptions,
  reason: CrossOriginDeniedReason,
): CrossOriginDecision {
  if (exemptions.isExcluded?.()) {
    return { allowed: true, reason: 'excluded' };
  }
  if (
    request.origin !== undefined &&
    exemptions.trustedOrigins?.has(request.origin)
  ) {
    return { allowed: true, reason: 'trusted-origin' };
  }
  return { allowed: false, reason };
}

function originMatchesHost(origin: string, host: string): boolean {
  // "null" (opaque origins, e.g. sandboxed iframes) and anything that is not
  // a URL never match a host.
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (!url.host) {
    return false;
  }
  // The URL parser lower-cases the host and drops the default port.
  const authority = host.toLowerCase();
  if (url.host === authority) {
    return true;
  }
  const defaultPort = DEFAULT_PORTS[url.protocol];
  return (
    !url.port &&
    defaultPort !== undefined &&
    `${url.hostname}:${defaultPort}` === authority
  );
}

/**
 * Validates a trusted origin and returns it in the form browsers serialize
 * the `Origin` header (lower-case scheme and host, no default port). Same
 * rules as Go's `AddTrustedOrigin`: a scheme and a host are required; a path
 * (even `/`), query string, fragment or credentials are not allowed.
 * Wildcards are rejected too, as origins are matched exactly.
 */
export function normalizeTrustedOrigin(origin: string): string {
  const fail = (reason: string): never => {
    throw new Error(`Invalid trusted origin "${origin}": ${reason}.`);
  };
  if (!isString(origin) || origin.length === 0) {
    return fail('expected a non-empty string');
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\/[^/?#\\]+$/i.test(origin)) {
    return fail(
      'expected "scheme://host[:port]", without a path, query string or ' +
        'fragment',
    );
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return fail('expected "scheme://host[:port]"');
  }
  if (!url.host) {
    fail('a host is required');
  }
  if (url.username || url.password) {
    fail('credentials are not allowed');
  }
  if (url.host.includes('*')) {
    fail('wildcards are not supported, list each origin');
  }
  return `${url.protocol}//${url.host}`;
}

const DENIED_MESSAGES: Record<CrossOriginDeniedReason, string> = {
  'cross-origin-sec-fetch-site':
    'Cross-origin request detected from Sec-Fetch-Site header',
  'cross-origin-origin-header':
    'Cross-origin request detected, and/or browser is out of date: ' +
    'Sec-Fetch-Site is missing, and Origin does not match Host',
};

/**
 * Request paths an exclusion never applies to, because a router or a proxy
 * may resolve them to a route the exclusion was not meant for: `#` and `;`
 * (path delimiters for some routers), backslashes, empty segments, dot
 * segments, and percent-encoded `.`, `/` and `\`. Such requests are checked
 * like any other (fails closed).
 */
const NON_CANONICAL_PATH = /[#;\\]|\/\/|%2e|%2f|%5c|\/\.\.?(?:\/|$)/i;

/**
 * Binds {@link evaluateCrossOriginRequest} to an HTTP adapter: reads the
 * request through the adapter accessors and turns a rejection into a
 * `ForbiddenException`, so exception filters shape the `403` response.
 *
 * Used by `app.enableCsrfProtection()`.
 */
export class CrossOriginProtection<TRequest = any> {
  private readonly trustedOrigins: ReadonlySet<string>;
  private readonly excludedRoutes: RouteInfo[] = [];
  private readonly excludePredicate?: (request: TRequest) => boolean;
  private resolvedExclusions: ExcludeRouteMetadata[] = [];

  /**
   * Validates the options, so that a bad configuration fails as soon as
   * `app.enableCsrfProtection()` is called.
   */
  constructor(
    private readonly httpAdapter: HttpServer<TRequest>,
    options: CsrfProtectionOptions<TRequest> = {},
  ) {
    if (!isPlainObject(options)) {
      throw new Error(
        'Invalid CSRF protection options: expected an options object.',
      );
    }
    for (const key of Object.keys(options)) {
      if (key !== 'trustedOrigins' && key !== 'exclude') {
        throw new Error(
          `Invalid CSRF protection options: unknown option "${key}" ` +
            '(expected "trustedOrigins", "exclude").',
        );
      }
    }
    const { trustedOrigins = [] } = options;
    if (!Array.isArray(trustedOrigins)) {
      throw new Error(
        'Invalid CSRF protection "trustedOrigins" option: expected a list ' +
          'of origins.',
      );
    }
    this.trustedOrigins = new Set(trustedOrigins.map(normalizeTrustedOrigin));
    const { exclude } = options;
    if (isFunction(exclude)) {
      this.excludePredicate = exclude;
    } else if (Array.isArray(exclude)) {
      this.excludedRoutes = exclude.map(toRouteInfo);
      for (const route of this.excludedRoutes) {
        compileExclusion(route.path, route.method, false);
      }
    } else if (exclude !== undefined) {
      throw new Error(
        'Invalid CSRF protection "exclude" option: expected a list of ' +
          'routes or a function.',
      );
    }
  }

  /**
   * Resolves the excluded routes to the paths they are served at, like
   * `MiddlewareConsumer.exclude()` does: with the global prefix (unless the
   * route is excluded from it) and, with URI versioning, the version segment
   * of `RouteInfo.version`. Called by `app.init()`, once the global prefix
   * and versioning are final; until then nothing is excluded.
   */
  public resolveExclusions(pathExtractor: RouteInfoPathExtractor): void {
    this.resolvedExclusions = this.excludedRoutes.flatMap(route =>
      pathExtractor
        .extractPathFrom(route)
        .map(path => compileExclusion(path, route.method, true)),
    );
  }

  /**
   * Returns a `ForbiddenException` when the request must be rejected, and
   * `undefined` otherwise.
   */
  public check(request: TRequest): ForbiddenException | undefined {
    const headers = ((request as any).headers ?? {}) as IncomingHttpHeaders;
    const decision = evaluateCrossOriginRequest(
      {
        method: this.httpAdapter.getRequestMethod!(request),
        secFetchSite: readHeader(headers, 'sec-fetch-site'),
        origin: readHeader(headers, 'origin'),
        // On HTTP/2, ":authority" identifies the target and takes precedence
        // over a "Host" header (RFC 9113, section 8.3.1).
        host: readHeader(headers, ':authority') ?? readHeader(headers, 'host'),
      },
      {
        trustedOrigins: this.trustedOrigins,
        isExcluded: () => this.isExcluded(request),
      },
    );
    if (decision.allowed) {
      return undefined;
    }
    return new ForbiddenException(DENIED_MESSAGES[decision.reason]);
  }

  private isExcluded(request: TRequest): boolean {
    if (this.excludePredicate) {
      return !!this.excludePredicate(request);
    }
    if (this.resolvedExclusions.length === 0) {
      return false;
    }
    const url = this.httpAdapter.getRequestUrl!(request) ?? '';
    const queryIndex = url.indexOf('?');
    const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
    if (!pathname.startsWith('/') || NON_CANONICAL_PATH.test(pathname)) {
      return false;
    }
    const method = this.httpAdapter.getRequestMethod!(request);
    return isRouteExcluded(
      this.resolvedExclusions,
      pathname,
      RequestMethod[method as keyof typeof RequestMethod],
    );
  }
}

function toRouteInfo(route: string | RouteInfo): RouteInfo {
  if (isString(route)) {
    return { path: addLeadingSlash(route), method: RequestMethod.ALL };
  }
  if (
    !route ||
    !isString(route.path) ||
    typeof route.method !== 'number' ||
    RequestMethod[route.method] === undefined
  ) {
    throw new Error(
      `Invalid CSRF protection exclusion ${JSON.stringify(route)}: expected ` +
        'a path, or a { path, method } object where method is a ' +
        'RequestMethod.',
    );
  }
  return { ...route, path: addLeadingSlash(route.path) };
}

/**
 * Compiles an exclusion like `MiddlewareConsumer.exclude()` does, except that
 * the match is exact: case-sensitive (Fastify routes case-sensitively, so
 * `/WEBHOOKS` may reach another route) and without an optional trailing
 * slash (Fastify routes `/webhooks/` to `/webhooks/:id` with an empty `id`).
 */
function compileExclusion(
  path: string,
  requestMethod: RequestMethod,
  logs: boolean,
): ExcludeRouteMetadata {
  const converted = LegacyRouteConverter.tryConvert(path, { logs });
  const normalized =
    converted.length > 1 ? converted.replace(/\/+$/, '') : converted;
  return {
    path: normalized,
    requestMethod,
    pathRegex: pathToRegexp(addLeadingSlash(normalized) || '/', {
      sensitive: true,
      trailing: false,
    }).regexp,
  };
}

function readHeader(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];
  if (value === undefined) {
    return undefined;
  }
  // Repeated headers are joined, so a request with conflicting values never
  // equals "same-origin" or a trusted origin (fails closed).
  return Array.isArray(value) ? value.join(', ') : value;
}
