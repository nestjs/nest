import {
  multerExceptions,
  type MultipartErrorCode,
} from './multipart.constants.js';

/**
 * Mirrors multer's `MulterError`: identified by `code`, and may carry the
 * name of the offending `field`.
 */
export class MultipartError extends Error {
  constructor(
    readonly code: MultipartErrorCode,
    readonly field?: string,
  ) {
    super(multerExceptions[code]);
    this.name = 'MultipartError';
  }
}
