import urlSanitizer from 'find-my-way/lib/url-sanitizer.js';

/**
 * Drops the trailing slash of a pattern, so that "/users/" matches "/users"
 * as well (as the Express router does).
 */
export function loosen(path: string) {
  return path === '/' ? path : path.replace(/\/+$/, '');
}

/**
 * Returns the path of an absolute-form request target
 * ("GET http://host/path HTTP/1.1"), `null` when it is malformed, and any other
 * target unchanged. Mirrors find-my-way, so that middleware and routes always
 * see the same path.
 */
function getPathFromAbsoluteUrl(url: string): string | null {
  const schemeEnd = url.indexOf('://');
  if (schemeEnd === -1) {
    return url;
  }
  const scheme = url.slice(0, schemeEnd).toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') {
    return url;
  }
  const authorityStart = schemeEnd + 3;
  let authorityEnd = url.length;
  const pathStart = url.indexOf('/', authorityStart);
  if (pathStart !== -1) {
    authorityEnd = pathStart;
  }
  const queryStart = url.indexOf('?', authorityStart);
  if (queryStart !== -1 && queryStart < authorityEnd) {
    authorityEnd = queryStart;
  }
  // Fragments are not valid in a request target
  if (
    url.indexOf('#', authorityStart) !== -1 ||
    authorityEnd === authorityStart
  ) {
    return null;
  }
  if (!URL.canParse(url) || new URL(url).host.length === 0) {
    return null;
  }
  if (authorityEnd === url.length) {
    return '/';
  }
  if (authorityEnd === queryStart) {
    return '/' + url.slice(queryStart);
  }
  return url.slice(pathStart);
}

/**
 * The path a request is routed by: the normalization find-my-way applies
 * before looking up a route (an absolute-form target resolved to its path,
 * percent-encoding decoded except for reserved characters such as "%2F", the
 * query string and any fragment dropped). Middleware is matched against this
 * path as well; matching the raw URL instead would let "/%61dmin" reach the
 * "/admin" route while skipping the middleware guarding it.
 *
 * Throws a `URIError` for a malformed target or percent-encoding.
 */
export function getRoutingPath(url: string): string {
  // A fragment is not valid in a request target. Cutting it off here while
  // other code sees the raw URL would let "GET /api#/" match differently in
  // different places, so reject it (400).
  if (url.indexOf('#') !== -1) {
    throw new URIError(`Invalid request target: "${url}"`);
  }
  if (url.charCodeAt(0) === 47 /* / */ && url.indexOf('%') === -1) {
    // Nothing to decode
    const index = url.indexOf('?');
    return index === -1 ? url : url.slice(0, index);
  }
  let path: string | null = url;
  if (url.charCodeAt(0) !== 47) {
    path = getPathFromAbsoluteUrl(url);
    if (path === null) {
      throw new URIError(`Invalid request target: "${url}"`);
    }
  }
  return urlSanitizer.safeDecodeURI(path, false).path;
}

/**
 * Returns the index in the raw request URL where `routingPrefix`, a prefix of
 * its routing path (see `getRoutingPath()`), ends. Decoding never turns
 * "%2F" into "/", so the raw URL has the same "/"-separated segments.
 */
export function getRawPrefixEnd(url: string, routingPrefix: string): number {
  let start = 0;
  if (url.charCodeAt(0) !== 47 /* / */) {
    // Absolute-form target: skip "scheme://authority"
    const schemeEnd = url.indexOf('://');
    const pathStart = schemeEnd === -1 ? -1 : url.indexOf('/', schemeEnd + 3);
    start = pathStart === -1 ? url.length : pathStart;
  }
  let slashes = 0;
  for (let i = 0; i < routingPrefix.length; i++) {
    if (routingPrefix.charCodeAt(i) === 47) {
      slashes++;
    }
  }
  let i = start;
  for (; i < url.length; i++) {
    const char = url.charCodeAt(i);
    if (char === 63 /* ? */ || char === 35 /* # */) {
      break;
    }
    if (char === 47 && slashes-- === 0) {
      break;
    }
  }
  return i;
}
