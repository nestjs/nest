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
 * Stream-based interceptor for handling multiple file uploads on the H3 platform
 * from a single field.
 * Uses @fastify/busboy for efficient stream processing.
 * Supports storage backends (disk/memory) and form field extraction.
 *
 * @param fieldName The name of the field containing the files
 * @param maxCount Maximum number of files to accept (optional)
 * @param localOptions Optional configuration options (storage, limits, fileFilter)
 *
 * @example
 * ```typescript
 * import { diskStorage } from '@nestjs/platform-h3';
 *
 * @Post('upload')
 * @UseInterceptors(FilesStreamInterceptor('files', 5, {
 *   storage: diskStorage({ destination: './uploads' })
 * }))
 * uploadFiles(@UploadedFiles() files: H3UploadedFile[]) {
 *   // files[].path contains the paths on disk
 * }
 * ```
 *
 * @publicApi
 */
export function FilesStreamInterceptor(
  fieldName: string,
  maxCount?: number,
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

      // Apply maxCount to the files limit if specified
      if (maxCount !== undefined) {
        mergedOptions.limits = {
          ...mergedOptions.limits,
          files: maxCount,
        };
      }

      // Parse multipart form data using busboy for stream processing
      const { files, fields } = await parseMultipartWithBusboy(
        h3Event,
        mergedOptions,
      );

      // Filter to get only files from the specified field
      const fieldFiles = filterFilesByFieldNameStream(files, fieldName);

      // Enforce maxCount if specified (in case there are multiple fields)
      if (maxCount !== undefined && fieldFiles.length > maxCount) {
        // Truncate to maxCount
        request.files = fieldFiles.slice(0, maxCount);
      } else {
        request.files = fieldFiles;
      }

      // Also attach form fields to request
      request.formFields = fields;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
