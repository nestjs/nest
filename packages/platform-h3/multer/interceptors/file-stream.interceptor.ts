import {
  CallHandler,
  ExecutionContext,
  Inject,
  mixin,
  NestInterceptor,
  Optional,
  Type,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MULTER_MODULE_OPTIONS } from '../files.constants';
import { H3MulterModuleOptions } from '../interfaces';
import { H3MulterOptions } from '../interfaces/multer-options.interface';
import {
  parseMultipartWithBusboy,
  filterFilesByFieldNameStream,
} from '../multer/stream.utils';

/**
 * Stream-based interceptor for handling single file uploads on the H3 platform.
 * Uses @fastify/busboy for efficient stream processing.
 * Supports storage backends (disk/memory) and form field extraction.
 *
 * @param fieldName The name of the field containing the file
 * @param localOptions Optional configuration options (storage, limits, fileFilter)
 *
 * @example
 * ```typescript
 * import { diskStorage } from '@nestjs/platform-h3';
 *
 * @Post('upload')
 * @UseInterceptors(FileStreamInterceptor('file', {
 *   storage: diskStorage({ destination: './uploads' })
 * }))
 * uploadFile(@UploadedFile() file: H3UploadedFile) {
 *   // file.path contains the path on disk
 * }
 * ```
 *
 * @publicApi
 */
export function FileStreamInterceptor(
  fieldName: string,
  localOptions?: H3MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      protected options: H3MulterModuleOptions = {},
    ) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest();

      // Get H3 event from request
      const h3Event = request.h3Event;
      if (!h3Event) {
        // If no h3Event, continue without file processing
        return next.handle();
      }

      const mergedOptions: H3MulterOptions = {
        ...this.options,
        ...localOptions,
      };

      // Parse multipart form data using busboy for stream processing
      const { files, fields } = await parseMultipartWithBusboy(
        h3Event,
        mergedOptions,
      );

      // Filter to get only the file from the specified field
      const fieldFiles = filterFilesByFieldNameStream(files, fieldName);

      // Set single file on request (matching multer behavior)
      request.file = fieldFiles.length > 0 ? fieldFiles[0] : undefined;

      // Also attach form fields to request
      request.formFields = fields;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
