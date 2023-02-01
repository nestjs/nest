export const multerExceptions = {
  // from https://github.com/expressjs/multer/blob/master/lib/multer-error.js
  LIMIT_PART_COUNT: 'Too many parts',
  LIMIT_FILE_SIZE: 'File too large',
  LIMIT_FILE_COUNT: 'Too many files',
  LIMIT_FIELD_KEY: 'Field name too long',
  LIMIT_FIELD_VALUE: 'Field value too long',
  LIMIT_FIELD_COUNT: 'Too many fields',
  LIMIT_UNEXPECTED_FILE: 'Unexpected field',
  MISSING_FIELD_NAME: 'Field name missing',
};

export const busboyExceptions = {
  // from https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js
  MULTIPART_BOUNDARY_NOT_FOUND: 'Multipart: Boundary not found',
  MULTIPART_MALFORMED_PART_HEADER: 'Malformed part header',
  MULTIPART_UNEXPECTED_END_OF_FORM: 'Unexpected end of form',
  MULTIPART_UNEXPECTED_END_OF_FILE: 'Unexpected end of file',
};
