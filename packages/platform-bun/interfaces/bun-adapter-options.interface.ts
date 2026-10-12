import type { TLSOptions } from 'bun';

/**
 * Options forwarded to `Bun.serve()`.
 *
 * @publicApi
 */
export interface BunServeOptions {
  /**
   * Seconds a connection may sit idle before Bun closes it (max 255, 0
   * disables). Default 120.
   */
  idleTimeout?: number;
  /** Hard cap on request bodies, in bytes. Default 128 MiB (Bun's default). */
  maxRequestBodySize?: number;
  /** TLS options; set automatically from Nest's `httpsOptions`. */
  tls?: TLSOptions;
  reusePort?: boolean;
  development?: boolean;
  /**
   * Max milliseconds a graceful `close()` waits for in-flight requests before
   * forcing. Default 10000.
   */
  shutdownTimeout?: number;
}

/**
 * Options accepted by the `BunAdapter` constructor.
 *
 * @publicApi
 */
export interface BunAdapterOptions {
  /** Options forwarded to `Bun.serve()`. */
  serve?: BunServeOptions;
  /**
   * Trust `X-Forwarded-*` headers for `req.ip`, `req.hostname` and
   * `req.protocol`. Default `false`.
   */
  trustProxy?: boolean;
  /**
   * Default body limit for the built-in JSON/urlencoded parsers, e.g. `'1mb'`.
   * Default `100kb` (Express parity).
   */
  bodyLimit?: number | string;
}
