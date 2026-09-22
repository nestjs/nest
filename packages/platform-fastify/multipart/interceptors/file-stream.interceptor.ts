import type { NestInterceptor, Type } from '@nestjs/common';
import type { MultipartOptions } from '../interfaces/index.js';
import { createMultipartStreamInterceptor } from '../multipart/multipart-interceptor.factory.js';

/**
 * Hands the route handler a single file in `fieldName` as a stream
 * (`req.file.stream`, see `MultipartFileStream`), without buffering it or
 * writing it to disk. Fastify only; there is no platform-express
 * counterpart.
 *
 * - Text fields must precede the file in the form: parts that follow it are
 *   not parsed.
 * - Whatever the handler leaves unread is discarded before the response is
 *   sent, so that the client can finish uploading. When the handler returns
 *   a `StreamableFile` (which may be the upload itself), it is discarded
 *   once the response has been sent instead. So a handler that responds
 *   with a `StreamableFile` of something other than the upload should read
 *   the upload first: otherwise, when the connection is not kept alive
 *   (`Connection: close`), Node.js closes it right after the response, and
 *   a client still uploading fails with EPIPE / ECONNRESET.
 * - A file in any other field fails the request with a 400.
 * - The file size is unknown up front, so `MaxFileSizeValidator` does not
 *   apply, and neither does `FileTypeValidator`'s magic-number check.
 * - Once `limits.fileSize` is exceeded, the stream errors with a
 *   `PayloadTooLargeException`.
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
