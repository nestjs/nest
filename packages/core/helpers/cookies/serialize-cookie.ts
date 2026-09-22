import type { CookieSerializeOptions } from '@nestjs/common';

/**
 * RFC 7230 `token`, which RFC 6265 requires for cookie names.
 */
const COOKIE_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/**
 * RFC 1034 host name, optionally with a leading dot.
 */
const COOKIE_DOMAIN_REGEXP =
  /^\.?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
/**
 * RFC 6265 `path-value`: any printable ASCII character except `;`.
 */
const COOKIE_PATH_REGEXP = /^[ -:<-~]*$/; // 0x20-0x3A, 0x3C-0x7E

const SAME_SITE_VALUES = new Map([
  ['strict', 'Strict'],
  ['lax', 'Lax'],
  ['none', 'None'],
]);
const PRIORITY_VALUES = new Map([
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
]);

/**
 * Builds the value of a `Set-Cookie` response header (RFC 6265, section 4.1).
 *
 * The value is percent-encoded with `encodeURIComponent()`, whose output only
 * contains RFC 6265 `cookie-octet`s. `path` defaults to `/`. Throws a
 * `TypeError` when the name, the value or an attribute would produce an
 * invalid header or smuggle extra attributes (`;`, CR, LF, ...), and when
 * `sameSite: 'none'` or `partitioned` is set without `secure`, since browsers
 * reject such cookies.
 *
 * Signing is not handled here: pass an already signed value.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions = {},
): string {
  if (typeof name !== 'string' || !COOKIE_NAME_REGEXP.test(name)) {
    throw new TypeError(`Invalid cookie name: ${JSON.stringify(name)}`);
  }
  if (typeof value !== 'string') {
    throw new TypeError(
      `Invalid value for cookie "${name}": expected a string, received ${typeof value}`,
    );
  }
  let encodedValue: string;
  try {
    encodedValue = encodeURIComponent(value);
  } catch {
    // Lone UTF-16 surrogates cannot be percent-encoded.
    throw new TypeError(
      `Invalid value for cookie "${name}": not a well-formed string`,
    );
  }
  let header = `${name}=${encodedValue}`;

  const path = options.path ?? '/';
  if (typeof path !== 'string' || !COOKIE_PATH_REGEXP.test(path)) {
    throw new TypeError(`Invalid path for cookie "${name}"`);
  }
  header += `; Path=${path}`;

  if (options.domain !== undefined) {
    if (
      typeof options.domain !== 'string' ||
      !COOKIE_DOMAIN_REGEXP.test(options.domain)
    ) {
      throw new TypeError(`Invalid domain for cookie "${name}"`);
    }
    header += `; Domain=${options.domain}`;
  }
  if (options.maxAge !== undefined) {
    if (!Number.isSafeInteger(options.maxAge)) {
      throw new TypeError(
        `Invalid maxAge for cookie "${name}": expected an integer number of seconds`,
      );
    }
    header += `; Max-Age=${options.maxAge}`;
  }
  if (options.expires !== undefined) {
    if (
      !(options.expires instanceof Date) ||
      Number.isNaN(options.expires.getTime())
    ) {
      throw new TypeError(`Invalid expires date for cookie "${name}"`);
    }
    header += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.httpOnly) {
    header += '; HttpOnly';
  }
  if (options.secure) {
    header += '; Secure';
  }
  if (options.partitioned) {
    if (!options.secure) {
      throw new TypeError(
        `Invalid options for cookie "${name}": "partitioned" requires "secure: true"`,
      );
    }
    header += '; Partitioned';
  }
  if (options.priority !== undefined) {
    const priority = PRIORITY_VALUES.get(
      String(options.priority).toLowerCase(),
    );
    if (!priority) {
      throw new TypeError(`Invalid priority for cookie "${name}"`);
    }
    header += `; Priority=${priority}`;
  }
  if (options.sameSite !== undefined) {
    const sameSite = SAME_SITE_VALUES.get(
      String(options.sameSite).toLowerCase(),
    );
    if (!sameSite) {
      throw new TypeError(`Invalid sameSite for cookie "${name}"`);
    }
    if (sameSite === 'None' && !options.secure) {
      throw new TypeError(
        `Invalid options for cookie "${name}": "sameSite: 'none'" requires "secure: true"`,
      );
    }
    header += `; SameSite=${sameSite}`;
  }
  return header;
}
