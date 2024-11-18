/**
 * "fastify-static" interfaces
 * @see https://github.com/fastify/fastify-static/blob/master/types/index.d.ts
 * @publicApi
 */
import { RouteOptions, FastifyRequest, FastifyReply } from 'fastify';
import { Stats } from 'fs';

interface SetHeadersResponse {
  getHeader: FastifyReply['getHeader'];
  setHeader: FastifyReply['header'];
  readonly filename: string;
  statusCode: number;
}

interface ExtendedInformation {
  fileCount: number;
  totalFileCount: number;
  folderCount: number;
  totalFolderCount: number;
  totalSize: number;
  lastModified: number;
}

interface ListDir {
  href: string;
  name: string;
  stats: Stats;
  extendedInfo?: ExtendedInformation;
}

interface ListFile {
  href: string;
  name: string;
  stats: Stats;
}

interface ListRender {
  (dirs: ListDir[], files: ListFile[]): string;
}

interface ListOptions {
  names: string[];
  extendedFolderInfo?: boolean;
  jsonFormat?: 'names' | 'extended';
}

export interface ListOptionsJsonFormat extends ListOptions {
  format: 'json';
  // Required when the URL parameter `format=html` exists
  render?: ListRender;
}

export interface ListOptionsHtmlFormat extends ListOptions {
  format: 'html';
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
  index?: string[] | string | false;
  lastModified?: boolean;
  maxAge?: string | number;
  serveDotFiles?: boolean;
}

export interface FastifyStaticOptions extends SendOptions {
  root: string | string[] | URL | URL[];
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (res: SetHeadersResponse, path: string, stat: Stats) => void;
  redirect?: boolean;
  wildcard?: boolean;
  list?: boolean | ListOptionsJsonFormat | ListOptionsHtmlFormat;
  allowedPath?: (
    pathName: string,
    root: string,
    request: FastifyRequest,
  ) => boolean;
  /**
   * @description
   * Opt-in to looking for pre-compressed files
   */
  preCompressed?: boolean;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[] | string | false;
  lastModified?: boolean;
  maxAge?: string | number;
  constraints?: RouteOptions['constraints'];
}
