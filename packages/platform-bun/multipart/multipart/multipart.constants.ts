/**
 * Same codes and messages as multer's `MulterError`, copied from
 * `@nestjs/platform-express` (`multer/multer/multer.constants.ts`) so that
 * clients see identical error responses on every adapter without this
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
  LIMIT_FIELD_ARRAY_INDEX: 'Field name array index too large',
  // A multer 2.4 code raised for field names that would pollute a prototype.
  INVALID_FIELD_NAME: 'Invalid field name',
} as const;

export type MultipartErrorCode = keyof typeof multerExceptions;

/**
 * The messages platform-express reports for busboy parser errors, used for
 * the equivalent `Request.formData()` failures.
 */
export const busboyExceptions = {
  MULTIPART_BOUNDARY_NOT_FOUND: 'Multipart: Boundary not found',
  MULTIPART_UNEXPECTED_END_OF_FORM: 'Multipart: Unexpected end of form',
} as const;

export const WRONG_ADAPTER_MESSAGE =
  'File upload interceptors from "@nestjs/platform-bun" only work with the BunAdapter. ' +
  'With the ExpressAdapter, import them from "@nestjs/platform-express" instead.';

export const BODY_CONSUMED_MESSAGE =
  'The multipart body was already consumed by another middleware.';
