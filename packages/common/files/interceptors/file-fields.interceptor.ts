import * as multer from 'multer';
import { Observable } from 'rxjs';
import { Inject, Optional } from '../../decorators';
import { mixin } from '../../decorators/core/injectable.decorator';
import { ExecutionContext, Type } from '../../interfaces';
import {
  MulterField,
  MulterOptions,
} from '../../interfaces/external/multer-options.interface';
import { NestInterceptor } from '../../interfaces/features/nest-interceptor.interface';
import { MULTER_MODULE_OPTIONS } from '../files.constants';
import { MulterModuleOptions } from '../interfaces';
import { transformException } from '../multer/multer.utils';

type MulterInstance = any;

export function FileFieldsInterceptor(
  uploadFields: MulterField[],
  localOptions?: MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    readonly upload: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {},
    ) {
      this.upload = multer({
        ...options,
        ...localOptions,
      });
    }

    async intercept(
      context: ExecutionContext,
      call$: Observable<any>,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();

      await new Promise((resolve, reject) =>
        this.upload.fields(uploadFields)(
          ctx.getRequest(),
          ctx.getResponse(),
          (err: any) => {
            if (err) {
              const error = transformException(err);
              return reject(error);
            }
            resolve();
          },
        ),
      );
      return call$;
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor as Type<NestInterceptor>;
}
