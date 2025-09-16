import { RequestMethod } from '../enums/request-method.enum';

/**
 * Route rewrite configuration options.
 * Allows routing requests from old paths to new paths.
 *
 * @publicApi
 */
export interface RouteRewriteOptions {
  /**
   * The original path to rewrite from.
   */
  from: string;

  /**
   * The destination path to rewrite to.
   */
  to: string;

  /**
   * HTTP methods to apply the rewrite rule to.
   * If not specified, applies to all methods.
   */
  methods?: RequestMethod | RequestMethod[];

  /**
   * HTTP status code for the redirect response.
   * @default 301 (Moved Permanently)
   */
  statusCode?: number;
}
