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
}
