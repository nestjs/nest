import * as multer from 'multer';
import { Observable } from 'rxjs';
import { mixin } from '../decorators/core/component.decorator';
import { ExecutionContext } from '../interfaces';
import { MulterField, MulterOptions } from '../interfaces/external/multer-options.interface';
import { NestInterceptor } from './../interfaces/features/nest-interceptor.interface';
import { transformException } from './multer/multer.utils';

export function FileFieldsInterceptor(
  uploadFields: MulterField[],
  options?: MulterOptions,
) {
  const Interceptor = mixin(class implements NestInterceptor {
    readonly upload = multer(options);

    async intercept(
      context: ExecutionContext,
      call$: Observable<any>,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();

      await new Promise((resolve, reject) =>
        this.upload.fields(uploadFields)(
          ctx.getRequest(),
          ctx.getResponse(),
          err => {
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
  });
  return Interceptor;
}
