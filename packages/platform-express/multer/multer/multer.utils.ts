import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { finished } from 'stream';
import { multerExceptions, busboyExceptions } from './multer.constants';

/**
 * Set on a request whose pipes rejected it, by the router of
 * `@nestjs/core` (see `markRejectedByPipes()` there). Read through the
 * registered symbol rather than an import, so this package still loads with
 * a version of `@nestjs/core` that does not set it.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');

function isRejectedByPipes(req: any): boolean {
  return req?.[REJECTED_BY_PIPES] === true;
}

/**
 * Removes the files multer stored for `req` when the route's pipes reject
 * the request (e.g. `ParseFilePipe`): the route handler never sees them, and
 * nothing else would remove them. They are removed once the response has
 * been sent, as an exception filter may still use (or remove) them.
 */
export function removeFilesOnPipeRejection<T>(
  storage: any,
  req: any,
  res: any,
): MonoTypeOperatorFunction<T> {
  return catchError(err => {
    if (isRejectedByPipes(req)) {
      finished(res, () => {
        for (const file of storedFiles(req)) {
          try {
            storage._removeFile(req, file, () => undefined);
          } catch {
            // The request has failed already.
          }
        }
      });
    }
    return throwError(() => err);
  });
}

function storedFiles(req: any): any[] {
  const { file, files } = req;
  if (file) {
    return [file];
  }
  return Array.isArray(files) ? files : Object.values(files ?? {}).flat();
}

// Multer may add in a 'field' property to the error
// https://github.com/expressjs/multer/blob/aa42bea6ac7d0cb8fcb279b15a7278cda805dc63/lib/multer-error.js#L19
export function transformException(
  error: (Error & { field?: string; code?: string }) | undefined,
) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  // Multer identifies its errors by `code`, while the messages may change
  // between releases (e.g. "Unexpected field" became "Unexpected file field")
  const exception = isMulterExceptionCode(error.code)
    ? multerExceptions[error.code]
    : error.message;
  switch (exception) {
    case multerExceptions.LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(error.message);
    case multerExceptions.LIMIT_FILE_COUNT:
    case multerExceptions.LIMIT_FIELD_KEY:
    case multerExceptions.LIMIT_FIELD_VALUE:
    case multerExceptions.LIMIT_FIELD_COUNT:
    case multerExceptions.LIMIT_FIELD_NESTING:
    case multerExceptions.LIMIT_FIELD_ARRAY_INDEX:
    case multerExceptions.INVALID_FIELD_NAME:
    case multerExceptions.LIMIT_UNEXPECTED_FILE:
    case multerExceptions.LIMIT_PART_COUNT:
    case multerExceptions.MISSING_FIELD_NAME:
      if (error.field) {
        return new BadRequestException(`${error.message} - ${error.field}`);
      }
      return new BadRequestException(error.message);
    case busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND:
      return new BadRequestException(error.message);
    case busboyExceptions.MULTIPART_MALFORMED_PART_HEADER:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE:
      return new BadRequestException(`Multipart: ${error.message}`);
  }
  return error;
}

function isMulterExceptionCode(
  code: unknown,
): code is keyof typeof multerExceptions {
  return (
    typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(multerExceptions, code)
  );
}
