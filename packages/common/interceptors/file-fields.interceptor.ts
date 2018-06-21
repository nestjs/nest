import * as multer from 'multer';
import { NestInterceptor } from './../interfaces/features/nest-interceptor.interface';
import { Observable } from 'rxjs';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
import { transformException } from './multer/multer.utils';
import { ExecutionContext } from '../interfaces';

export function FileFieldsInterceptor(
  uploadFields: multer.Field[],
  options?: MulterOptions
) {
  const Interceptor = class implements NestInterceptor {
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
  };
  return Interceptor;
}
