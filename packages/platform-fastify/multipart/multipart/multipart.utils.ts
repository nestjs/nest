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
import {
  busboyExceptions,
  fastifyBusboyMessages,
  fastifyMultipartBadRequestCodes,
  fastifyMultipartErrorCodes,
} from './multipart.constants.js';
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
 *
 * Errors raised by `@fastify/multipart` are identified by their `code`; only
 * `@fastify/busboy`'s errors, which carry no code, are matched by message.
 */
export function transformException(
  error: (Error & { code?: string; part?: { fieldname?: string } }) | undefined,
) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  if (isFastifyMultipartLimitCode(error.code)) {
    error = new MultipartError(
      fastifyMultipartErrorCodes[error.code],
      error.part?.fieldname,
    );
  }
  if (error instanceof MultipartError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new PayloadTooLargeException(error.message);
    }
    return new BadRequestException(
      error.field ? `${error.message} - ${error.field}` : error.message,
    );
  }
  if (error.code && fastifyMultipartBadRequestCodes.includes(error.code)) {
    return new BadRequestException(error.message);
  }
  const message = error.message ?? '';
  if (message === fastifyBusboyMessages.BOUNDARY_NOT_FOUND) {
    return new BadRequestException(
      busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND,
    );
  }
  if (
    message === fastifyBusboyMessages.UNEXPECTED_END_OF_FORM ||
    message.includes(fastifyBusboyMessages.PART_TERMINATED_EARLY)
  ) {
    return new BadRequestException(
      busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
    );
  }
  return error;
}

function isFastifyMultipartLimitCode(
  code: unknown,
): code is keyof typeof fastifyMultipartErrorCodes {
  return (
    typeof code === 'string' && Object.hasOwn(fastifyMultipartErrorCodes, code)
  );
}
