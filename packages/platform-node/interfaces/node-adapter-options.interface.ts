/**
 * Proxies whose `X-Forwarded-*` headers the `NodeAdapter` trusts (see
 * {@link NodeAdapterOptions.trustProxy}): every proxy (`true`), addresses or
 * subnets (`'loopback'`, `'10.0.0.0/8'`, or several, comma-separated or in an
 * array), or a function deciding for each address and its hop count from the
 * socket (`0`). As with Fastify, there is no hop count: it cannot tell a
 * proxy from a client that sends its own `X-Forwarded-For`.
 *
 * @publicApi
 */
export type NodeTrustProxy =
  boolean | string | string[] | ((address: string, hop: number) => boolean);

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
   * Proxies to trust, as with Fastify's `trustProxy` option (and Express'
   * "trust proxy" setting, but for a hop count, which Fastify does not trust
   * either); `false` by default. For a request that comes from a
   * trusted proxy, `req.ip` and `req.ips` are read from `X-Forwarded-For`,
   * `req.protocol` (and `req.secure`) from `X-Forwarded-Proto`, and
   * `req.hostname` from `X-Forwarded-Host`, the way Express reads them.
   * `req.app.get('trust proxy')` returns the setting.
   */
  trustProxy?: NodeTrustProxy;
  /**
   * Parses the query string (without the leading "?", and `''` when the URL
   * has none) into `req.query`, as with Fastify's option of the same name.
   * By default, `fast-querystring` parses it into flat keys
   * (`?a[b]=1` gives `{ 'a[b]': '1' }`); `(str) => qs.parse(str)` gives
   * nested objects and arrays.
   */
  querystringParser?: (str: string) => Record<string, any>;
}
