import type { BunResponse } from '../adapters/bun-response.js';

/**
 * Options of `app.useStaticAssets()`, a `serve-static` subset backed by
 * `Bun.file()`.
 *
 * @publicApi
 */
export interface ServeStaticOptions {
  /** URL prefix the files are mounted under, e.g. `/public`. */
  prefix?: string;
  /** Directory index file, or `false` to disable. Default `index.html`. */
  index?: string | false;
  /**
   * `Cache-Control: max-age` in **milliseconds** (Express parity) or a string
   * like `1d`.
   */
  maxAge?: number | string;
  immutable?: boolean;
  /** Serve dotfiles? Default `ignore` (falls through as not found). */
  dotfiles?: 'allow' | 'deny' | 'ignore';
  /** Call `next()` when a file is missing (default) instead of sending 404. */
  fallthrough?: boolean;
  /** Redirect `/dir` to `/dir/` when it is a directory. Default `true`. */
  redirect?: boolean;
  /** Send `ETag` and honor conditional requests. Default `true`. */
  etag?: boolean;
  /** Send `Last-Modified` and honor conditional requests. Default `true`. */
  lastModified?: boolean;
  /** Sets extra headers per file. */
  setHeaders?: (res: BunResponse, path: string) => void;
}
