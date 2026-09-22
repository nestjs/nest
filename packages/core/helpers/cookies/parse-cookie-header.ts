/**
 * Dictionary of cookies keyed by name. Created without a prototype, so names
 * such as `__proto__` or `constructor` are stored as plain entries.
 */
export type CookieRecord = Record<string, string>;

/**
 * Parses a `Cookie` request header (RFC 6265, section 5.4) into a
 * prototype-less dictionary.
 *
 * - pairs are separated by `;`, and split on the first `=` only;
 * - names and values are trimmed, and a value wrapped in double quotes is
 *   unquoted;
 * - values are percent-decoded, falling back to the raw value when they are
 *   not valid percent-encoding;
 * - pairs without `=` or with an empty name are ignored;
 * - when a name occurs more than once, the first occurrence wins (browsers
 *   send the most specific path first).
 */
export function parseCookieHeader(
  header: string | string[] | undefined | null,
): CookieRecord {
  const cookies: CookieRecord = Object.create(null);
  if (!header) {
    return cookies;
  }
  const source = Array.isArray(header) ? header.join('; ') : String(header);

  for (const pair of source.split(';')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const name = pair.slice(0, eqIndex).trim();
    if (!name || name in cookies) {
      continue;
    }
    let value = pair.slice(eqIndex + 1).trim();
    if (value.length >= 2 && value[0] === '"' && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    cookies[name] = safeDecode(value);
  }
  return cookies;
}

function safeDecode(value: string): string {
  if (!value.includes('%')) {
    return value;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
