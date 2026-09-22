/**
 * Same codes and messages as multer's `MulterError`, copied from
 * `@nestjs/platform-express` (`multer/multer/multer.constants.ts`) so that
 * clients see identical error responses on both adapters without this
 * package depending on platform-express.
 */
export const multerExceptions = {
  // from https://github.com/expressjs/multer/blob/master/lib/multer-error.js
  LIMIT_PART_COUNT: 'Too many parts',
  LIMIT_FILE_SIZE: 'File too large',
  LIMIT_FILE_COUNT: 'Too many files',
  LIMIT_FIELD_KEY: 'Field name too long',
  LIMIT_FIELD_VALUE: 'Field value too long',
  LIMIT_FIELD_COUNT: 'Too many fields',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
  MISSING_FIELD_NAME: 'Field name missing',
  LIMIT_FIELD_NESTING: 'Field name nesting too deep',
  // A multer 2.4 code that platform-express's table lacks. Raised here for
  // field names that would pollute a prototype, which multer accepts.
  INVALID_FIELD_NAME: 'Invalid field name',
} as const;

export type MultipartErrorCode = keyof typeof multerExceptions;

/**
 * The messages platform-express reports for busboy 1.x parser errors
 * (prefixed with "Multipart: "), which is what multer bundles.
 */
export const busboyExceptions = {
  MULTIPART_BOUNDARY_NOT_FOUND: 'Multipart: Boundary not found',
  MULTIPART_UNEXPECTED_END_OF_FORM: 'Multipart: Unexpected end of form',
  MULTIPART_UNEXPECTED_END_OF_FILE: 'Multipart: Unexpected end of file',
} as const;

/**
 * `@fastify/busboy` raises plain `Error`s without a `code`, so these are the
 * only messages matched verbatim. Everything `@fastify/multipart` raises is
 * matched by its `code` instead (see `fastifyMultipartErrorCodes`).
 *
 * @see https://github.com/fastify/busboy/blob/main/deps/dicer/lib/Dicer.js
 */
export const fastifyBusboyMessages = {
  BOUNDARY_NOT_FOUND: 'Multipart: Boundary not found',
  // Emitted on the parser when the body ends early...
  UNEXPECTED_END_OF_FORM: 'Unexpected end of multipart data',
  // ...and on the file stream that was being read at that moment. Both are
  // reported as "Unexpected end of form", as multer does for a truncated body.
  PART_TERMINATED_EARLY: 'terminated early due to unexpected end',
} as const;

/**
 * `@fastify/multipart` error codes (created with `@fastify/error`) mapped to
 * the multer code that describes the same condition.
 *
 * @see https://github.com/fastify/fastify-multipart/blob/main/index.js
 */
export const fastifyMultipartErrorCodes: Record<string, MultipartErrorCode> = {
  FST_PARTS_LIMIT: 'LIMIT_PART_COUNT',
  FST_FILES_LIMIT: 'LIMIT_FILE_COUNT',
  FST_FIELDS_LIMIT: 'LIMIT_FIELD_COUNT',
  FST_REQ_FILE_TOO_LARGE: 'LIMIT_FILE_SIZE',
  FST_PROTO_VIOLATION: 'INVALID_FIELD_NAME',
};

/**
 * `@fastify/multipart` error codes that already describe a client error and
 * are reported as a 400 with their own message.
 */
export const fastifyMultipartBadRequestCodes = [
  'FST_MP_PREMATURE_CLOSE',
  'FST_INVALID_JSON_FIELD_ERROR',
];

export const MISSING_PLUGIN_MESSAGE =
  'File upload interceptors from "@nestjs/platform-fastify/multipart" require the "@fastify/multipart" plugin, ' +
  'which the FastifyAdapter registers unless its "multipart" option is false. ' +
  'Either remove that option, or register the plugin yourself (`await app.register(multipart)`).';

export const PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE =
  'File upload interceptors from "@nestjs/platform-fastify/multipart" require the "@fastify/multipart" plugin, ' +
  'which was not registered before the Fastify instance started. ' +
  'Register it at startup: `new FastifyAdapter({ multipart: true })`, or `await app.register(multipart)`.';

export const WRONG_ADAPTER_MESSAGE =
  'File upload interceptors from "@nestjs/platform-fastify/multipart" only work with the FastifyAdapter. ' +
  'With the ExpressAdapter, import them from "@nestjs/platform-express" instead.';
