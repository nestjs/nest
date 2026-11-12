import {
  CallHandler,
  ExecutionContext,
  Inject,
  mixin,
  NestInterceptor,
  Optional,
  Type,
} from '@nestjs/common';
import * as multer from 'multer';
import { Observable } from 'rxjs';
import { MULTER_MODULE_OPTIONS } from '../files.constants';
import { MulterModuleOptions } from '../interfaces';
import { MulterOptions } from '../interfaces/multer-options.interface';
import {
  applyDefaultLimits,
  mergeMulterOptions,
  runMulter,
} from '../multer/multer.utils';

type MulterInstance = any;

/**
 *
 * @param localOptions
 * @publicApi
 */
export function NoFilesInterceptor(
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

      await runMulter(this.multer.none(), ctx.getRequest(), ctx.getResponse());
      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
