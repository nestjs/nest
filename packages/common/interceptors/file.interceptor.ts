import * as multer from 'multer';
import { NestInterceptor } from './../interfaces/features/nest-interceptor.interface';
import { Observable } from 'rxjs';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
import { mixin } from '../decorators/core/component.decorator';
import { transformException } from './multer/multer.utils';
import { ExecutionContext } from './../interfaces';

export function FileInterceptor(fieldName: string, options?: MulterOptions) {
  return mixin(
    class implements NestInterceptor {
      readonly upload = multer(options);

      async intercept(
        context: ExecutionContext,
        call$: Observable<any>,
      ): Promise<Observable<any>> {
        const ctx = context.switchToHttp();

        await new Promise((resolve, reject) =>
          this.upload.single(fieldName)(
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
    },
  );
}
