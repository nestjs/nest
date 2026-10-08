import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { isPlainObject } from '@nestjs/common/internal';
import { multerExceptions, busboyExceptions } from './multer.constants.js';
import { MulterModuleOptions } from '../interfaces/index.js';
import { MulterOptions } from '../interfaces/multer-options.interface.js';

/**
 * Merges module-level (global) multer options with interceptor-level (local)
 * options. `limits` is merged key-by-key rather than replaced outright, so
 * that a route overriding e.g. `limits.fileSize` doesn't silently drop other
 * global limits (such as `limits.files`) it never intended to touch.
 *
 * `limits` may also be a function of the request (multer >= 2.4.0), which
 * can't be merged key-by-key. In that case (or when only one side defines
 * `limits`) the local value wins outright, matching the pre-merge behaviour.
 */
export function mergeMulterOptions(
  options: MulterModuleOptions = {},
  localOptions: MulterOptions = {},
): MulterModuleOptions {
  const merged: MulterModuleOptions = { ...options, ...localOptions };
  if (isPlainObject(options.limits) && isPlainObject(localOptions.limits)) {
    merged.limits = { ...options.limits, ...localOptions.limits };
  }
  return merged;
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
  return typeof code === 'string' && Object.hasOwn(multerExceptions, code);
}
