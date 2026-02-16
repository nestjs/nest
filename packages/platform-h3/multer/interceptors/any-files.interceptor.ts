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
import { parseMultipartFormData } from '../multer/multipart.utils';

/**
 * Interceptor for handling file uploads from any fields on the H3 platform.
 * Accepts files from any field without filtering by field name.
 * Uses H3's native multipart form data parsing.
 *
 * @param localOptions Optional configuration options
 *
 * @publicApi
 */
export function AnyFilesInterceptor(
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

      // Set all files on request (matching multer behavior for .any())
      request.files = files;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
