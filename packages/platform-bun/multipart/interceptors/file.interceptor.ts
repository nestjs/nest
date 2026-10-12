import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Accepts a single file in `fieldName` and exposes it as `req.file`
 * (`@UploadedFile()`), with the text fields in `req.body`. The Bun
 * counterpart of platform-express's `FileInterceptor`.
 *
 * Parsed with Bun's native `Request.formData()`; requires the `BunAdapter`.
 *
 * @param fieldName name of the form field that carries the file
 * @param localOptions options merged over the `MultipartModule` defaults
 *
 * @publicApi
 */
export function FileInterceptor(
  fieldName: string,
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  return createMultipartInterceptor(
    { fields: [{ name: fieldName, maxCount: 1 }], strategy: 'VALUE' },
    localOptions,
  );
}
