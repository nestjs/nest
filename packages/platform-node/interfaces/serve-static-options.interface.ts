/**
 * Options of `useStaticAssets()`, passed through to `serve-static`.
 *
 * @see https://www.npmjs.com/package/serve-static
 *
 * @publicApi
 */
export interface ServeStaticOptions {
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[] | false;
  fallthrough?: boolean;
  immutable?: boolean;
  index?: boolean | string | string[];
  lastModified?: boolean;
  maxAge?: number | string;
  redirect?: boolean;
  setHeaders?: (res: any, path: string, stat: any) => any;
  /**
   * URL path the files are served under.
   */
  prefix?: string;
}
