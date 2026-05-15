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
import { transformException } from '../multer/multer.utils.js';

type MulterInstance = any;

/**
 * @param localOptions
 *
 * @publicApi
 */
export function AnyFilesInterceptor(
  localOptions?: MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected multer: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {},
    ) {
      this.multer = (multer as any)({
        ...options,
        ...localOptions,
      });
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();

      await new Promise<void>((resolve, reject) =>
        this.multer.any()(ctx.getRequest(), ctx.getResponse(), (err: any) => {
          if (err) {
            const error = transformException(err);
            return reject(error);
          }
          resolve();
        }),
      );
      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
