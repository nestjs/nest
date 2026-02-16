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
import {
  H3MulterField,
  H3MulterOptions,
} from '../interfaces/multer-options.interface';
import {
  parseMultipartFormData,
  groupFilesByFields,
} from '../multer/multipart.utils';

/**
 * Interceptor for handling file uploads from multiple fields on the H3 platform.
 * Uses H3's native multipart form data parsing.
 *
 * @param uploadFields Array of field configurations specifying field names and max counts
 * @param localOptions Optional configuration options
 *
 * @publicApi
 */
export function FileFieldsInterceptor(
  uploadFields: H3MulterField[],
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

      // Parse multipart form data using H3's native approach
      const files = await parseMultipartFormData(h3Event, mergedOptions);

      // Group files by field names according to the uploadFields configuration
      const groupedFiles = groupFilesByFields(files, uploadFields);

      // Set files object on request (matching multer behavior for .fields())
      request.files = groupedFiles;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
