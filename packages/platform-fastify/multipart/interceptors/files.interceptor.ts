import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Accepts up to `maxCount` files in `fieldName` and exposes them as an array
 * in `req.files` (`@UploadedFiles()`). The Fastify counterpart of
 * platform-express's `FilesInterceptor`.
 *
 * @param fieldName name of the form field that carries the files
 * @param maxCount maximum number of files to accept
 * @param localOptions options merged over the `MultipartModule` defaults
 *
 * @publicApi
 */
export function FilesInterceptor(
  fieldName: string,
  maxCount?: number,
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  return createMultipartInterceptor(
    { fields: [{ name: fieldName, maxCount }], strategy: 'ARRAY' },
    localOptions,
  );
}
