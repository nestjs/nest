import { isObject } from '@nestjs/common/internal';
import type { CookieSigner } from './cookie-signer.js';
import { CookieRecord, parseCookieHeader } from './parse-cookie-header.js';

/**
 * Parsed `Cookie` header per request, so the header is parsed at most once
 * however many parameters read cookies.
 */
const parsedCookiesCache = new WeakMap<object, CookieRecord>();

function getParsedCookieHeader(req: Record<string, any>): CookieRecord {
  let cookies = parsedCookiesCache.get(req);
  if (!cookies) {
    cookies = parseCookieHeader(req.headers?.cookie);
    parsedCookiesCache.set(req, cookies);
  }
  return cookies;
}

/**
 * Returns the request cookies. `req.cookies`, when a cookie middleware
 * (`cookie-parser`, `@fastify/cookie`) already populated it, takes precedence
 * over parsing the `Cookie` header.
 */
export function getRequestCookies(req: Record<string, any>): CookieRecord {
  if (isObject(req.cookies)) {
    return req.cookies as CookieRecord;
  }
  return getParsedCookieHeader(req);
}

/**
 * Returns a single request cookie, or `undefined` when it was not sent. Only
 * own entries count, so names such as `constructor` never resolve to
 * inherited members of a middleware-provided `req.cookies` object.
 */
export function getRequestCookie(
  req: Record<string, any>,
  name: string,
): string | undefined {
  const cookies = getRequestCookies(req);
  return Object.prototype.hasOwnProperty.call(cookies, name)
    ? cookies[name]
    : undefined;
}

/**
 * Returns the request cookies whose signature verifies, with their unsigned
 * value. Cookies that are not signed, or whose signature does not verify, are
 * left out.
 *
 * Without a signer (no `cookies.secret` option), falls back to
 * `req.signedCookies` as populated by `cookie-parser`, dropping the entries it
 * marked invalid (`false`). Throws when neither is available.
 */
export function getRequestSignedCookies(
  req: Record<string, any>,
  signer: CookieSigner | undefined,
): CookieRecord {
  const signedCookies: CookieRecord = Object.create(null);
  if (signer) {
    const cookies = getParsedCookieHeader(req);
    for (const name of Object.keys(cookies)) {
      const value = signer.unsign(cookies[name]);
      if (value !== undefined) {
        signedCookies[name] = value;
      }
    }
    return signedCookies;
  }
  if (isObject(req.signedCookies)) {
    for (const [name, value] of Object.entries(
      req.signedCookies as Record<string, unknown>,
    )) {
      // `false` marks an invalid signature. Other values are kept as is,
      // including the objects cookie-parser makes of `j:` JSON cookies.
      if (value !== false) {
        signedCookies[name] = value as string;
      }
    }
    return signedCookies;
  }
  throw new Error(
    'Cannot read signed cookies: no cookie secret is configured. ' +
      'Pass "cookies: { secret }" to NestFactory.create().',
  );
}

/**
 * Returns the unsigned value of a single signed cookie, or `undefined` when it
 * is missing or its signature does not verify. Same fallbacks as
 * {@link getRequestSignedCookies}.
 */
export function getRequestSignedCookie(
  req: Record<string, any>,
  name: string,
  signer: CookieSigner | undefined,
): string | undefined {
  if (signer) {
    const value = getParsedCookieHeader(req)[name];
    return value === undefined ? undefined : signer.unsign(value);
  }
  return getRequestSignedCookies(req, signer)[name];
}
