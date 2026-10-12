import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartStreamInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Hands the route handler a single file in `fieldName` as a stream
 * (`req.file.stream`, see `MultipartFileStream`) instead of storing it.
 * API-compatible with platform-fastify's `FileStreamInterceptor`.
 *
 * - Bun's `Request.formData()` parses the whole body before the handler
 *   runs, so the stream reads from memory, not from the socket.
 * - Text fields sent before the file are in `req.body`.
 * - A file in any other field fails the request with a 400.
 * - A file larger than `limits.fileSize` fails the request with a 413.
 *
 * @param fieldName name of the form field that carries the file
 * @param localOptions options merged over the `MultipartModule` defaults
 *   (`dest` and `storage` do not apply)
 *
 * @publicApi
 */
export function FileStreamInterceptor(
  fieldName: string,
  localOptions?: Omit<MultipartOptions, 'dest' | 'storage'>,
): Type<NestInterceptor> {
  return createMultipartStreamInterceptor(fieldName, localOptions);
}
