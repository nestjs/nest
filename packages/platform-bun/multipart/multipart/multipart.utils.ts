import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { isPlainObject } from '@nestjs/common/internal';
import type {
  MultipartModuleOptions,
  MultipartOptions,
} from '../interfaces/index.js';
import { busboyExceptions } from './multipart.constants.js';
import { MultipartError } from './multipart.error.js';

/**
 * Merges module-level (global) options with interceptor-level (local)
 * options, with the same rule as platform-express's `mergeMulterOptions`:
 * `limits` is merged key-by-key when both sides define it as an object, and
 * the local value wins outright otherwise.
 */
export function mergeMultipartOptions(
  options: MultipartModuleOptions = {},
  localOptions: MultipartOptions = {},
): MultipartModuleOptions {
  const merged: MultipartModuleOptions = { ...options, ...localOptions };
  if (isPlainObject(options.limits) && isPlainObject(localOptions.limits)) {
    merged.limits = { ...options.limits, ...localOptions.limits };
  }
  return merged;
}

/**
 * Maps parser errors to the same HTTP exceptions (status and message)
 * platform-express's `transformException` produces for multer, so clients
 * cannot tell the adapters apart.
 */
export function transformException(error: Error | undefined) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  if (error instanceof MultipartError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new PayloadTooLargeException(error.message);
    }
    return new BadRequestException(
      error.field ? `${error.message} - ${error.field}` : error.message,
    );
  }
  return error;
}

/**
 * Maps a `Request.formData()` failure (a malformed or truncated body) to the
 * busboy message platform-express reports for it.
 */
export function transformParseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return new BadRequestException(
    /boundary/i.test(message)
      ? busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND
      : busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
  );
}
