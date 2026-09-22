import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Accepts every file, in any field, and exposes them as an array in
 * `req.files` (`@UploadedFiles()`). The Fastify counterpart of
 * platform-express's `AnyFilesInterceptor`.
 *
 * @param localOptions options merged over the `MultipartModule` defaults
 *
 * @publicApi
 */
export function AnyFilesInterceptor(
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  return createMultipartInterceptor(
    { fields: 'ANY', strategy: 'ARRAY' },
    localOptions,
  );
}
