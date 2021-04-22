/**
 * "fastify-static" interfaces
 * @see https://github.com/fastify/fastify-static/blob/master/index.d.ts
 */

interface ListDir {
  href: string;
  name: string;
}

interface ListFile {
  href: string;
  name: string;
}

interface ListRender {
  (dirs: ListDir[], files: ListFile[]): string;
}

interface ListOptions {
  format: 'json' | 'html';
  names: string[];
  render: ListRender;
}

// Passed on to `send`
interface SendOptions {
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[] | false;
  lastModified?: boolean;
  maxAge?: string | number;
}

export interface FastifyStaticOptions extends SendOptions {
  root: string | string[];
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (...args: any[]) => void;
  redirect?: boolean;
  wildcard?: boolean;
  list?: boolean | ListOptions;
  allowedPath?: (pathName: string, root?: string) => boolean;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[] | false;
  lastModified?: boolean;
  maxAge?: string | number;
}
