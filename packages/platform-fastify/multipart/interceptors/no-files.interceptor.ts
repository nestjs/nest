import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Accepts text fields only (exposed in `req.body`); any file fails the
 * request with a 400. The Fastify counterpart of platform-express's
 * `NoFilesInterceptor`.
 *
 * @param localOptions options merged over the `MultipartModule` defaults
 *
 * @publicApi
 */
export function NoFilesInterceptor(
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  return createMultipartInterceptor(
    { fields: [], strategy: 'NONE' },
    localOptions,
  );
}
