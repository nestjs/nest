/**
 * Set origin to a function implementing some custom logic. The function takes the
 * request origin as the first parameter and a callback (which expects the signature
 * err [object], allow [bool]) as the second.
 *
 * @see https://github.com/expressjs/cors
 *
 * @publicApi
 */
export type CustomOrigin = (
  requestOrigin: string,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

/**
 * Interface describing CORS options that can be set.
 *
 * @see https://github.com/expressjs/cors
 * @publicApi
 */
export interface CorsOptions {
  /**
   * Configures the `Access-Control-Allow-Origins` CORS header.  See [here for more detail.](https://github.com/expressjs/cors#configuration-options)
   */
  origin?: boolean | string | RegExp | (string | RegExp)[] | CustomOrigin;
  /**
   * Configures the Access-Control-Allow-Methods CORS header.
   */
  methods?: string | string[];
  /**
   * Configures the Access-Control-Allow-Headers CORS header.
   */
  allowedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Expose-Headers CORS header.
   */
  exposedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Allow-Credentials CORS header.
   */
  credentials?: boolean;
  /**
   * Configures the Access-Control-Max-Age CORS header.
   */
  maxAge?: number;
  /**
   * Whether to pass the CORS preflight response to the next handler.
   */
  preflightContinue?: boolean;
  /**
   * Provides a status code to use for successful OPTIONS requests.
   */
  optionsSuccessStatus?: number;
}
