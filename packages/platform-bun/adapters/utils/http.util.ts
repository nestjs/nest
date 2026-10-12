/** Express 5's "simple" query parser: repeated keys become arrays, no nesting. */
export function parseQuery(search: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!search || search === '?') {
    return out;
  }
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}

const CHARSET_TYPES =
  /^(text\/|application\/(json|javascript|xml|.*\+json|.*\+xml))/i;

/** Express adds `charset=utf-8` to text-like content types that lack one. */
export function normalizeContentType(value: string): string {
  if (/;\s*charset=/i.test(value)) {
    return value;
  }
  return CHARSET_TYPES.test(value) ? `${value}; charset=utf-8` : value;
}

const SHORT_TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  text: 'text/plain',
  txt: 'text/plain',
  json: 'application/json',
  js: 'application/javascript',
  css: 'text/css',
  xml: 'application/xml',
  bin: 'application/octet-stream',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  csv: 'text/csv',
};

/** `res.type('json')` → `application/json`; full types pass through. */
export function lookupType(type: string): string {
  if (type.includes('/')) {
    return type;
  }
  const ext = type.startsWith('.') ? type.slice(1) : type;
  return SHORT_TYPES[ext.toLowerCase()] ?? 'application/octet-stream';
}

export const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export const statusText = (code: number): string =>
  STATUS_TEXT[code] ?? String(code);

/** Parse a byte-size string like `100kb`, `5mb`, or a number of bytes. */
export function parseBytes(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(value.trim());
  if (!match) {
    throw new TypeError(`Invalid byte size: ${value}`);
  }
  const amount = parseFloat(match[1]!);
  const unit = (match[2] ?? 'b').toLowerCase();
  const multiplier =
    unit === 'gb'
      ? 1024 ** 3
      : unit === 'mb'
        ? 1024 ** 2
        : unit === 'kb'
          ? 1024
          : 1;
  return Math.floor(amount * multiplier);
}
