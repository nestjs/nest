import type { IncomingMessage, ServerResponse } from 'http';
import contentType from 'content-type';
import qs from 'qs';
import secureJson from 'secure-json-parse';
import type { Readable, Transform } from 'stream';
import typeIs from 'type-is';
import { createBrotliDecompress, createGunzip, createInflate } from 'zlib';

/**
 * Options shared by every body parser. They mirror the ones of the
 * `body-parser` package, so that applications moving from the
 * `ExpressAdapter` keep their configuration.
 *
 * @publicApi
 */
export interface NodeBodyParserOptions {
  /**
   * Maximum body size, in bytes or as a string such as `'100kb'`.
   * Defaults to `'100kb'`.
   */
  limit?: number | string;
  /**
   * Whether to decompress `gzip`, `deflate` and `br` bodies. Defaults to
   * `true`; when `false`, compressed bodies are rejected with a 415.
   */
  inflate?: boolean;
  /**
   * Media type(s) the parser handles, or a function deciding it.
   */
  type?: string | string[] | ((req: IncomingMessage) => boolean);
  /**
   * Called with the raw body before parsing; throw to reject the request
   * with a 403.
   */
  verify?: (
    req: IncomingMessage,
    res: ServerResponse,
    buffer: Buffer,
    encoding: string,
  ) => void;
}

/**
 * What to do with a body that tries to inject prototype properties, as with
 * Fastify: reject it with a 400 (`'error'`, the default), drop the offending
 * keys (`'remove'`), or keep them (`'ignore'`, the `body-parser` behavior).
 *
 * @publicApi
 */
export type NodePoisoningAction = 'error' | 'remove' | 'ignore';

/**
 * @publicApi
 */
export interface NodePrototypePoisoningOptions {
  /**
   * Action for `"__proto__"` keys. Defaults to `'error'`. In urlencoded
   * bodies, `qs` drops these keys itself, so `'remove'` and `'ignore'` both
   * leave them out there.
   */
  onProtoPoisoning?: NodePoisoningAction;
  /**
   * Action for `constructor.prototype` keys. Defaults to `'error'`.
   */
  onConstructorPoisoning?: NodePoisoningAction;
}

/**
 * @publicApi
 */
export interface NodeJsonParserOptions
  extends NodeBodyParserOptions, NodePrototypePoisoningOptions {
  /**
   * Only accept arrays and objects. Defaults to `true`.
   */
  strict?: boolean;
  reviver?: (key: string, value: any) => any;
}

/**
 * @publicApi
 */
export interface NodeUrlencodedParserOptions
  extends NodeBodyParserOptions, NodePrototypePoisoningOptions {
  /**
   * Parse nested objects and arrays (`a[b]=c`) with `qs`. Defaults to
   * `false`.
   */
  extended?: boolean;
  /**
   * Maximum number of parameters. Defaults to `1000`.
   */
  parameterLimit?: number;
  /**
   * Maximum nesting depth with `extended`. Defaults to `32`.
   */
  depth?: number;
}

/**
 * @publicApi
 */
export interface NodeTextParserOptions extends NodeBodyParserOptions {
  /**
   * Charset used when the request does not specify one. Defaults to
   * `'utf-8'`.
   */
  defaultCharset?: string;
}

type Middleware = (req: any, res: any, next: (err?: any) => void) => void;

interface ReaderOptions {
  limit: number;
  inflate: boolean;
  matchesType: (req: IncomingMessage) => boolean;
  verify: NodeBodyParserOptions['verify'];
  /** Charsets the parser accepts, `undefined` for any. */
  isValidCharset?: (charset: string) => boolean;
  defaultCharset: string;
}

const UNITS: Record<string, number> = {
  b: 1,
  kb: 1 << 10,
  mb: 1 << 20,
  gb: 1 << 30,
};

function parseLimit(limit: number | string | null | undefined): number {
  if (limit === undefined || limit === null) {
    return 100 * 1024;
  }
  if (typeof limit === 'number') {
    // An invalid limit must not silently disable the size check
    // (body-parser CVE-2026-12590)
    if (!Number.isFinite(limit) || limit < 0) {
      throw new TypeError(`Invalid body size limit: ${limit}`);
    }
    return limit;
  }
  const match =
    typeof limit === 'string'
      ? /^\s*(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?\s*$/i.exec(limit)
      : null;
  if (!match) {
    throw new TypeError(`Invalid body size limit: "${limit}"`);
  }
  return Math.floor(
    parseFloat(match[1]) * UNITS[(match[2] ?? 'b').toLowerCase()],
  );
}

function createHttpError(
  statusCode: number,
  message: string,
  type: string,
  properties: object = {},
  ErrorClass: typeof Error = Error,
) {
  const error = new ErrorClass(message);
  return Object.assign(error, {
    status: statusCode,
    statusCode,
    expose: statusCode < 500,
    type,
    ...properties,
  });
}

/**
 * Media type of the request (`content-type` without its parameters), lower
 * case.
 */
function getMediaType(req: IncomingMessage): string {
  const contentType = req.headers['content-type'];
  if (!contentType) {
    return '';
  }
  const index = contentType.indexOf(';');
  return (index === -1 ? contentType : contentType.slice(0, index))
    .trim()
    .toLowerCase();
}

function getCharset(req: IncomingMessage): string | undefined {
  const header = req.headers['content-type'];
  if (!header || header.indexOf(';') === -1) {
    return undefined;
  }
  try {
    // RFC 9110 parameter parsing (quoted strings included), as body-parser
    // does, so that a "charset=" inside another parameter's quoted value is
    // not mistaken for the charset
    return contentType.parse(header).parameters.charset?.toLowerCase();
  } catch {
    return undefined;
  }
}

function createTypeMatcher(
  type: NodeBodyParserOptions['type'],
  defaultType: string,
): (req: IncomingMessage) => boolean {
  if (typeof type === 'function') {
    return type;
  }
  const types =
    type === undefined ? [defaultType] : ([] as string[]).concat(type);
  // Plain media types (the defaults) are compared directly, anything else
  // ("json", "application/*", "*/*+json"...) goes through "type-is"
  if (types.every(t => t.includes('/') && !/[*+]/.test(t))) {
    const mediaTypes = new Set(types.map(t => t.toLowerCase()));
    return req => mediaTypes.has(getMediaType(req));
  }
  return req => typeIs(req, types) !== false;
}

function hasBody(req: IncomingMessage) {
  return (
    req.headers['transfer-encoding'] !== undefined ||
    req.headers['content-length'] !== undefined
  );
}

function getContentStream(req: IncomingMessage, inflate: boolean): Readable {
  const encoding = (
    req.headers['content-encoding'] ?? 'identity'
  ).toLowerCase();
  if (encoding === 'identity') {
    return req;
  }
  if (!inflate) {
    throw createHttpError(
      415,
      'content encoding unsupported',
      'encoding.unsupported',
      { encoding },
    );
  }
  let stream: Transform;
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      stream = createGunzip();
      break;
    case 'deflate':
      stream = createInflate();
      break;
    case 'br':
      stream = createBrotliDecompress();
      break;
    default:
      throw createHttpError(
        415,
        `unsupported content encoding "${encoding}"`,
        'encoding.unsupported',
        { encoding },
      );
  }
  req.pipe(stream);
  return stream;
}

/**
 * Reads the whole (decompressed) body, enforcing the size limit, then calls
 * `parse` with it. Requests without a body, or whose content type the parser
 * does not handle, are passed on untouched without any work.
 */
function createReader(
  options: ReaderOptions,
  parse: (buffer: Buffer, charset: string, req: IncomingMessage) => unknown,
  name: string,
): Middleware {
  const reader: Middleware = (req, res, next) => {
    // Nothing to read, already read by another parser, a client that went
    // away, or not our type
    if (
      !hasBody(req) ||
      req.readableEnded ||
      req.destroyed ||
      req.body !== undefined ||
      !options.matchesType(req)
    ) {
      return next();
    }
    const charset = getCharset(req) ?? options.defaultCharset;
    if (options.isValidCharset && !options.isValidCharset(charset)) {
      return next(
        createHttpError(
          415,
          `unsupported charset "${charset.toUpperCase()}"`,
          'charset.unsupported',
          { charset },
        ),
      );
    }

    const contentLength = req.headers['content-length'];
    const length =
      contentLength !== undefined ? parseInt(contentLength, 10) : undefined;
    const limit = options.limit;
    let stream: Readable;
    try {
      stream = getContentStream(req, options.inflate);
    } catch (error) {
      return dump(req, () => next(error));
    }
    if (stream === req && length !== undefined && length > limit) {
      return dump(req, () =>
        next(
          createHttpError(413, 'request entity too large', 'entity.too.large', {
            expected: length,
            length,
            limit,
          }),
        ),
      );
    }

    const chunks: Buffer[] = [];
    let received = 0;
    let finished = false;

    const cleanup = () => {
      finished = true;
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      req.off('close', onClose);
      if (stream !== req) {
        // An "error" event with no listener would crash the process
        stream.on('error', noop);
      }
    };
    const fail = (error: Error) => {
      if (finished) {
        return;
      }
      cleanup();
      if (stream !== req) {
        req.unpipe();
        stream.destroy();
      }
      dump(req, () => next(error));
    };
    const onData = (chunk: Buffer) => {
      received += chunk.length;
      if (received > limit) {
        return fail(
          createHttpError(413, 'request entity too large', 'entity.too.large', {
            limit,
            received,
          }),
        );
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (finished) {
        return;
      }
      cleanup();
      if (stream === req && length !== undefined && received !== length) {
        return next(
          createHttpError(
            400,
            'request size did not match content length',
            'request.size.invalid',
            { expected: length, length, received },
          ),
        );
      }
      const buffer =
        chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, received);
      if (options.verify) {
        try {
          options.verify(req, res, buffer, charset);
        } catch (error) {
          return next(toVerifyError(error, buffer));
        }
      }
      try {
        req.body = parse(buffer, charset, req);
      } catch (error) {
        return next(error);
      }
      next();
    };
    const aborted = () =>
      createHttpError(400, 'request aborted', 'request.aborted', {
        code: 'ECONNABORTED',
        expected: length,
        length,
        received,
      });
    const onError = (error: Error) =>
      fail(
        // Node.js destroys the request with an "aborted" error when the
        // client goes away mid-body
        req.destroyed && !req.complete
          ? aborted()
          : createHttpError(400, error.message, 'stream.error', {}, Error),
      );
    const onClose = () => {
      if (!req.complete) {
        fail(aborted());
      }
    };

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
    req.on('close', onClose);
  };
  // The adapter recognizes the default parsers by name (see
  // "registerParserMiddleware()")
  Object.defineProperty(reader, 'name', { value: name });
  return reader;
}

function noop() {}

// As with body-parser: a status the error carries wins over the 403
function toVerifyError(error: unknown, buffer: Buffer) {
  const failure =
    error instanceof Error
      ? error
      : new Error(String(error ?? 'verify failed'));
  const errorStatus =
    (failure as any).status || (failure as any).statusCode || 403;
  const status = errorStatus >= 400 && errorStatus < 600 ? errorStatus : 403;
  return Object.assign(failure, {
    status,
    statusCode: status,
    expose: status < 500,
    type: (failure as any).type || 'entity.verify.failed',
    body: buffer,
  });
}

/**
 * Reads off the rest of the request, so that the connection can be reused,
 * then calls `callback` once, also when the client goes away.
 */
function dump(req: IncomingMessage, callback: () => void) {
  // Ended, or destroyed (a client abort, whose "close" has already fired)
  if (req.readableEnded || req.destroyed) {
    return callback();
  }
  let called = false;
  const done = () => {
    if (!called) {
      called = true;
      callback();
    }
  };
  req.on('end', done);
  req.on('error', done);
  req.on('close', done);
  req.resume();
}

function getPoisoningActions(options?: NodePrototypePoisoningOptions) {
  return {
    protoAction: options?.onProtoPoisoning ?? 'error',
    constructorAction: options?.onConstructorPoisoning ?? 'error',
  };
}

function toParseError(error: Error, text: string) {
  return Object.assign(error, {
    status: 400,
    statusCode: 400,
    expose: true,
    type: 'entity.parse.failed',
    body: text,
  });
}

function decode(buffer: Buffer, charset: string): string {
  switch (charset) {
    case 'utf-8':
    case 'utf8': {
      const text = buffer.toString('utf8');
      // Without the byte order mark, as body-parser (and TextDecoder) do
      return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    }
    case 'us-ascii':
    case 'ascii':
    case 'latin1':
    case 'iso-8859-1':
      return buffer.toString('latin1');
    default: {
      let decoder: TextDecoder;
      try {
        decoder = new TextDecoder(charset);
      } catch {
        throw createHttpError(
          415,
          `unsupported charset "${charset.toUpperCase()}"`,
          'charset.unsupported',
          { charset },
        );
      }
      return decoder.encoding === 'windows-1252'
        ? decodeWindows1252(buffer)
        : decoder.decode(buffer);
    }
  }
}

// Characters of bytes 0x80-0x9F in windows-1252 (the rest match latin1)
const WINDOWS_1252_HIGH =
  '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
const C1_CONTROLS = /[\x80-\x9f]/g;

// Some Node.js 22 and 24 releases (e.g. 22.15, 24.4) decode windows-1252, and
// the labels mapped to it such as "cp1252", as ISO-8859-1 in TextDecoder
function decodeWindows1252(buffer: Buffer): string {
  return buffer
    .toString('latin1')
    .replace(C1_CONTROLS, char =>
      WINDOWS_1252_HIGH.charAt(char.charCodeAt(0) - 0x80),
    );
}

function firstNonWhitespaceChar(text: string): string | undefined {
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    // space, \t, \n, \r and the UTF-8 byte order mark
    if (
      char !== 32 &&
      char !== 9 &&
      char !== 10 &&
      char !== 13 &&
      char !== 0xfeff
    ) {
      return text[i];
    }
  }
  return undefined;
}

function toReaderOptions(
  options: NodeBodyParserOptions | undefined,
  defaultType: string,
  defaultCharset = 'utf-8',
  isValidCharset?: (charset: string) => boolean,
): ReaderOptions {
  return {
    limit: parseLimit(options?.limit),
    inflate: options?.inflate !== false,
    matchesType: createTypeMatcher(options?.type, defaultType),
    verify: options?.verify,
    isValidCharset,
    defaultCharset,
  };
}

/**
 * Parses `application/json` bodies into `req.body`. Behaves like
 * `bodyParser.json()`: strict by default, an empty body gives `{}`, and
 * invalid JSON is rejected with a `SyntaxError` carrying `status: 400`.
 *
 * @publicApi
 */
export function json(options?: NodeJsonParserOptions): Middleware {
  const strict = options?.strict !== false;
  const reviver = options?.reviver;
  const poisoningActions = getPoisoningActions(options);
  return createReader(
    toReaderOptions(options, 'application/json', 'utf-8', charset =>
      charset.startsWith('utf-'),
    ),
    (buffer, charset) => {
      const text = decode(buffer, charset);
      if (text.length === 0) {
        // An empty body is a common client-side mistake
        return {};
      }
      const first = firstNonWhitespaceChar(text);
      if (strict && first !== '{' && first !== '[') {
        throw createHttpError(
          400,
          first === undefined
            ? 'Unexpected end of JSON input'
            : `Unexpected token '${first}', "${text.slice(0, 20)}" is not valid JSON`,
          'entity.parse.failed',
          { body: text },
          SyntaxError,
        );
      }
      try {
        // JSON.parse(), then a scan for "__proto__" and "constructor" keys
        // only when the text contains one (the parser Fastify uses)
        return secureJson.parse(text, reviver, poisoningActions);
      } catch (error) {
        throw toParseError(error, text);
      }
    },
    'jsonParser',
  );
}

// A "__proto__" segment in a key "qs" parses with brackets ("a[__proto__]")
const PROTO_KEY = /(?:^|\[)__proto__(?:$|[[\]])/;

/**
 * Parses `application/x-www-form-urlencoded` bodies into `req.body`, with
 * `qs` (nested objects and arrays with `extended: true`), like
 * `bodyParser.urlencoded()`.
 *
 * @publicApi
 */
export function urlencoded(options?: NodeUrlencodedParserOptions): Middleware {
  const extended = options?.extended === true;
  const poisoningActions = getPoisoningActions(options);
  const scanForPoisoning =
    extended &&
    (poisoningActions.protoAction !== 'ignore' ||
      poisoningActions.constructorAction !== 'ignore');
  let parameterLimit = options?.parameterLimit ?? 1000;
  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number');
  }
  if (Number.isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0;
  }
  let depth = extended ? (options?.depth ?? 32) : 0;
  if (isNaN(depth) || depth < 0) {
    throw new TypeError('option depth must be a zero or a positive number');
  }
  if (Number.isFinite(depth)) {
    depth = depth | 0;
  }
  // "qs" silently drops "__proto__" keys; with 'error', reject them as the
  // JSON parser does
  const decoder =
    poisoningActions.protoAction === 'error'
      ? (
          value: string,
          defaultDecoder: (value: string, ...args: any[]) => string,
          charset: string,
          type: 'key' | 'value',
        ) => {
          const decoded = defaultDecoder(value, defaultDecoder, charset);
          if (
            type === 'key' &&
            (extended ? PROTO_KEY.test(decoded) : decoded === '__proto__')
          ) {
            throw new SyntaxError(
              'Object contains forbidden prototype property',
            );
          }
          return decoded;
        }
      : undefined;
  return createReader(
    toReaderOptions(
      options,
      'application/x-www-form-urlencoded',
      'utf-8',
      charset => charset === 'utf-8' || charset === 'iso-8859-1',
    ),
    (buffer, charset) => {
      const text = decode(buffer, charset);
      let parameterCount = 1;
      for (let i = 0; i < text.length; i++) {
        if (
          text.charCodeAt(i) === 38 /* & */ &&
          ++parameterCount > parameterLimit
        ) {
          throw createHttpError(
            413,
            'too many parameters',
            'parameters.too.many',
          );
        }
      }
      try {
        const body = qs.parse(text, {
          allowPrototypes: true,
          arrayLimit: extended ? Math.max(100, parameterCount) : parameterCount,
          depth,
          charset: charset === 'iso-8859-1' ? 'iso-8859-1' : 'utf-8',
          decoder,
          parameterLimit,
          strictDepth: true,
        });
        // "qs" drops "__proto__" keys, but nests "constructor[prototype][x]"
        // like the JSON payload the JSON parser rejects
        return scanForPoisoning
          ? secureJson.scan(body, poisoningActions)
          : body;
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw toParseError(error, text);
        }
        if (error instanceof RangeError) {
          throw createHttpError(
            400,
            'The input exceeded the depth',
            'querystring.parse.rangeError',
          );
        }
        throw error;
      }
    },
    'urlencodedParser',
  );
}

/**
 * Reads `text/plain` bodies into `req.body` as a string, like
 * `bodyParser.text()`.
 *
 * @publicApi
 */
export function text(options?: NodeTextParserOptions): Middleware {
  return createReader(
    toReaderOptions(options, 'text/plain', options?.defaultCharset ?? 'utf-8'),
    (buffer, charset) => decode(buffer, charset),
    'textParser',
  );
}

/**
 * Reads `application/octet-stream` bodies into `req.body` as a `Buffer`, like
 * `bodyParser.raw()`.
 *
 * @publicApi
 */
export function raw(options?: NodeBodyParserOptions): Middleware {
  return createReader(
    toReaderOptions(options, 'application/octet-stream'),
    buffer => buffer,
    'rawParser',
  );
}
