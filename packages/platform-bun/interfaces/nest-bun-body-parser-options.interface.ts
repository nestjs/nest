import type { BunRequest } from '../adapters/bun-request.js';

/**
 * Options of the built-in body parsers.
 *
 * @publicApi
 */
export interface NestBunBodyParserOptions {
  /** Max body size, e.g. `'100kb'` or bytes. Default `100kb` (Express parity). */
  limit?: number | string;
  /** Content types to parse; defaults depend on the parser. */
  type?: string | string[] | ((req: BunRequest) => boolean);
  /** Expose the unparsed bytes as `req.rawBody` (Nest's `rawBody: true`). */
  rawBody?: boolean;
  /** JSON only: accept only objects and arrays at the top level. Default `true`. */
  strict?: boolean;
  /** Text only: default charset when the request has none. Default `utf-8`. */
  defaultCharset?: string;
}
