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
  INVALID_FIELD_NAME: 'Invalid field name',
  // STREAM_DESTROYED is left out on purpose: it is raised by the storage
  // engine after the file stream was destroyed, not by the request, so it
  // stays a 500.
};

/**
 * Defaults of the field name limits that multer leaves at `Infinity`, which
 * let a single small request build an arbitrarily deep `req.body`
 * (`fieldNestingDepth`) or arrays of arbitrary length (`fieldArrayIndexLimit`).
 * `32` is the nesting depth `body-parser` allows in the urlencoded bodies the
 * ExpressAdapter parses; `1000` is the number of parameters it parses.
 */
export const DEFAULT_FIELD_NAME_LIMITS = {
  fieldNestingDepth: 32,
  fieldArrayIndexLimit: 1000,
} as const;

export const busboyExceptions = {
  // from https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js
  MULTIPART_BOUNDARY_NOT_FOUND: 'Multipart: Boundary not found',
  MULTIPART_MALFORMED_PART_HEADER: 'Malformed part header',
  MULTIPART_UNEXPECTED_END_OF_FORM: 'Unexpected end of form',
  MULTIPART_UNEXPECTED_END_OF_FILE: 'Unexpected end of file',
};
