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

export interface FastifyStaticOptions {
  root: string;
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (...args: any[]) => void;
  redirect?: boolean;
  wildcard?: boolean | string;
  list?: boolean | ListOptions;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: boolean;
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[];
  lastModified?: boolean;
  maxAge?: string | number;
}
