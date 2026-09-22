import type { RouteInfo } from '../middleware/middleware-configuration.interface.js';

/**
 * Options for `app.enableCsrfProtection()`.
 *
 * The protection is based on Fetch Metadata (`Sec-Fetch-Site`) with an
 * `Origin`/`Host` fallback, following the algorithm of Go's
 * `net/http.CrossOriginProtection`. It is not a token scheme: it relies on the
 * browser telling the server where a request comes from, which every
 * evergreen browser does since 2023.
 *
 * Browsers only send `Sec-Fetch-Site` to secure origins (HTTPS or
 * `localhost`). Otherwise the `Origin` header is compared with the `Host`
 * header the server receives (`X-Forwarded-Host` is ignored). Behind a proxy
 * that rewrites `Host`, preserve it, or list the public origin in
 * `trustedOrigins`.
 *
 * @publicApi
 */
export interface CsrfProtectionOptions<TRequest = any> {
  /**
   * Origins that may send cross-origin, state-changing requests, e.g.
   * `https://admin.example.com`. Each entry must be a serialized origin:
   * `scheme://host[:port]`, without a path, query string, fragment or
   * wildcard. Entries are normalized the way browsers serialize `Origin`
   * (lower-case, without the default port), and a request is exempt when its
   * `Origin` header equals one of them.
   *
   * Origins allowed by CORS are not trusted implicitly: list them here too.
   */
  trustedOrigins?: string[];
  /**
   * Requests that skip the protection altogether (for example webhook
   * endpoints called by third-party servers that send a foreign `Origin`).
   *
   * Either a list of routes, or a predicate receiving the platform request
   * object. Only consulted for requests that would otherwise be rejected.
   *
   * Routes are declared like `MiddlewareConsumer.exclude()`: a path, or
   * `{ path, method, version? }` to narrow by method (and URI version),
   * without the global prefix, which is added unless the route is excluded
   * from it. Unlike `exclude()`, the match is exact: case-sensitive, without
   * an optional trailing slash, and never for non-canonical request paths
   * (`//`, dot segments, `;`, encoded `/` or `.`), which a router could
   * resolve to a route that is not excluded.
   */
  exclude?: (string | RouteInfo)[] | ((request: TRequest) => boolean);
}
