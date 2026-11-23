import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  type NestInterceptor,
  Optional,
  type Type,
} from '@nestjs/common';
import multer from 'multer';
import { Observable } from 'rxjs';
import { MULTER_MODULE_OPTIONS } from '../files.constants.js';
import { MulterModuleOptions } from '../interfaces/index.js';
import { MulterOptions } from '../interfaces/multer-options.interface.js';
import {
  applyDefaultLimits,
  mergeMulterOptions,
  rejectPrototypePoisoning,
  removeFilesOnPipeRejection,
  runMulter,
} from '../multer/multer.utils.js';

type MulterInstance = any;

/**
 *
 * @param fieldName
 * @param maxCount
 * @param localOptions
 *
 * @publicApi
 */
export function FilesInterceptor(
  fieldName: string,
  maxCount?: number,
  localOptions?: MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected multer: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {},
    ) {
      this.multer = (multer as any)(
        applyDefaultLimits(mergeMulterOptions(options, localOptions)),
      );
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();

      await runMulter(
        this.multer.array(fieldName, maxCount),
        ctx.getRequest(),
        ctx.getResponse(),
      );
      await rejectPrototypePoisoning(this.multer.storage, ctx.getRequest());
      return next
        .handle()
        .pipe(
          removeFilesOnPipeRejection(
            this.multer.storage,
            ctx.getRequest(),
            ctx.getResponse(),
          ),
        );
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
