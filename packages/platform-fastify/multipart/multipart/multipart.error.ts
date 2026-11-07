import {
  multerExceptions,
  type MultipartErrorCode,
} from './multipart.constants.js';

/**
 * Mirrors multer's `MulterError`: identified by `code`, and may carry the
 * name of the offending `field`. A `LIMIT_FILE_SIZE` error may also carry the
 * `limit` that was exceeded, in bytes.
 */
export class MultipartError extends Error {
  constructor(
    readonly code: MultipartErrorCode,
    readonly field?: string,
    readonly limit?: number,
  ) {
    super(multerExceptions[code]);
    this.name = 'MultipartError';
  }
}
