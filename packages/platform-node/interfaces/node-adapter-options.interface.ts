/**
 * Proxies whose `X-Forwarded-*` headers the `NodeAdapter` trusts (see
 * {@link NodeAdapterOptions.trustProxy}): every proxy (`true`), a number of
 * hops, addresses or subnets (`'loopback'`, `'10.0.0.0/8'`, or several,
 * comma-separated or in an array), or a function deciding for each address
 * and its hop count from the socket (`0`).
 *
 * @publicApi
 */
export type NodeTrustProxy =
  | boolean
  | number
  | string
  | string[]
  | ((address: string, hop: number) => boolean);

/**
 * Options of the `NodeAdapter` (`new NodeAdapter(options)`).
 *
 * @publicApi
 */
export interface NodeAdapterOptions {
  /**
   * Longest (decoded) route parameter a route matches; `100` by default, as
   * with Fastify's `maxParamLength`. A request whose parameter is longer falls
   * through to another matching route (a sibling wildcard, for instance), if
   * any, or gets a 414 (URI Too Long). Wildcards are not limited.
   */
  maxParamLength?: number;
  /**
   * Proxies to trust, as with Express' "trust proxy" setting and Fastify's
   * `trustProxy` option; `false` by default. For a request that comes from a
   * trusted proxy, `req.ip` and `req.ips` are read from `X-Forwarded-For`,
   * `req.protocol` (and `req.secure`) from `X-Forwarded-Proto`, and
   * `req.hostname` from `X-Forwarded-Host`, the way Express reads them.
   * `req.app.get('trust proxy')` returns the setting.
   */
  trustProxy?: NodeTrustProxy;
}
