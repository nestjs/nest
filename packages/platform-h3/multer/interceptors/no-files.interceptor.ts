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
import { parseMultipartFormDataWithFields } from '../multer/multipart.utils';

/**
 * Interceptor for parsing multipart form data without accepting any files
 * on the H3 platform. Useful when you only want to parse text fields.
 * Uses H3's native multipart form data parsing.
 * Extracts form fields and attaches them to the request.
 *
 * @param localOptions Optional configuration options
 *
 * @publicApi
 */
export function NoFilesInterceptor(
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
        // Set files limit to 0 to reject any files
        limits: {
          ...this.options.limits,
          ...localOptions?.limits,
          files: 0,
        },
      };

      // Parse multipart form data - will throw if files are present
      // Form fields are extracted and attached to request
      const { fields } = await parseMultipartFormDataWithFields(
        h3Event,
        mergedOptions,
      );

      // Attach form fields to request
      request.formFields = fields;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
