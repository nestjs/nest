import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartField, MultipartOptions } from '../interfaces/index.js';
import { createMultipartInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Accepts files in each of `uploadFields` and exposes them grouped by field
 * name in `req.files` (`@UploadedFiles()`). The Fastify counterpart of
 * platform-express's `FileFieldsInterceptor`.
 *
 * @param uploadFields accepted fields, each with an optional `maxCount`
 * @param localOptions options merged over the `MultipartModule` defaults
 *
 * @publicApi
 */
export function FileFieldsInterceptor(
  uploadFields: MultipartField[],
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  return createMultipartInterceptor(
    { fields: uploadFields, strategy: 'OBJECT' },
    localOptions,
  );
}
