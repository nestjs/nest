import { stat } from 'node:fs/promises';
import { join, normalize, resolve, sep } from 'node:path';
import type { ServeStaticOptions } from '../../interfaces/serve-static-options.interface.js';
import type { RequestHandler } from '../bun-router.js';

/** Serves a directory with `Bun.file()`; a small `serve-static` for the Bun adapter. */
export function serveStatic(
  root: string,
  options: ServeStaticOptions = {},
): RequestHandler {
  const rootDir = resolve(root);
  const prefix = normalizePrefix(options.prefix);
  const index = options.index === undefined ? 'index.html' : options.index;
  const fallthrough = options.fallthrough ?? true;
  const redirect = options.redirect ?? true;
  const useEtag = options.etag ?? true;
  const useLastModified = options.lastModified ?? true;
  const dotfiles = options.dotfiles ?? 'ignore';
  const maxAgeSeconds = toSeconds(options.maxAge);

  return async function staticHandler(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    let pathname = req.path;
    if (prefix) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        return next();
      }
      pathname = pathname.slice(prefix.length) || '/';
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return fallthrough
        ? next()
        : res.status(400).type('txt').send('Bad Request');
    }
    if (decoded.includes('\0')) {
      return fallthrough
        ? next()
        : res.status(400).type('txt').send('Bad Request');
    }

    const segments = decoded.split('/');
    if (
      dotfiles !== 'allow' &&
      segments.some(segment => segment.length > 1 && segment.startsWith('.'))
    ) {
      if (dotfiles === 'deny') {
        return res.status(403).type('txt').send('Forbidden');
      }
      return next();
    }

    let filePath = normalize(join(rootDir, decoded));
    if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
      return next();
    }

    let info = await statSafe(filePath);
    if (info?.isDirectory()) {
      if (!index) {
        return next();
      }
      if (redirect && !req.path.endsWith('/')) {
        return res.redirect(
          301,
          `${req.path}/${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`,
        );
      }
      filePath = join(filePath, index);
      info = await statSafe(filePath);
    }
    if (!info || !info.isFile()) {
      return fallthrough
        ? next()
        : res.status(404).type('txt').send('Not Found');
    }

    const file = Bun.file(filePath);
    const etag = useEtag
      ? `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`
      : undefined;
    const lastModified = useLastModified
      ? new Date(info.mtimeMs).toUTCString()
      : undefined;

    if (etag) {
      res.setHeader('ETag', etag);
    }
    if (lastModified) {
      res.setHeader('Last-Modified', lastModified);
    }
    if (maxAgeSeconds !== undefined) {
      res.setHeader(
        'Cache-Control',
        `public, max-age=${maxAgeSeconds}${options.immutable ? ', immutable' : ''}`,
      );
    }
    options.setHeaders?.(res, filePath);

    if (isFresh(req.headers, etag, info.mtimeMs)) {
      res.removeHeader('Content-Length');
      return res.status(304).end();
    }

    res.sendBunFile(file);
  };
}

function normalizePrefix(prefix?: string): string | null {
  if (!prefix || prefix === '/') {
    return null;
  }
  let normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

async function statSafe(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

function toSeconds(maxAge: number | string | undefined): number | undefined {
  if (maxAge === undefined) {
    return undefined;
  }
  if (typeof maxAge === 'number') {
    return Math.floor(maxAge / 1000);
  }
  const match = /^(\d+)\s*(ms|s|m|h|d|w|y)?$/i.exec(maxAge.trim());
  if (!match) {
    throw new TypeError(`Invalid maxAge: ${maxAge}`);
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  const seconds = {
    ms: amount / 1000,
    s: amount,
    m: amount * 60,
    h: amount * 3600,
    d: amount * 86400,
    w: amount * 604800,
    y: amount * 31557600,
  }[unit]!;
  return Math.floor(seconds);
}

function isFresh(
  headers: Record<string, string>,
  etag: string | undefined,
  mtimeMs: number,
): boolean {
  const noneMatch = headers['if-none-match'];
  if (noneMatch && etag) {
    return noneMatch
      .split(',')
      .some(tag => tag.trim() === etag || tag.trim() === '*');
  }
  const since = headers['if-modified-since'];
  if (since) {
    const sinceMs = Date.parse(since);
    return (
      !Number.isNaN(sinceMs) && Math.floor(mtimeMs / 1000) * 1000 <= sinceMs
    );
  }
  return false;
}
