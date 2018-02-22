import * as multer from 'multer';
import { NestInterceptor } from './../interfaces/nest-interceptor.interface';
import { Observable } from 'rxjs/Observable';
import { MulterOptions } from '../interfaces/external/multer-options.interface';

export function FilesInterceptor(fieldName: string, maxCount?: number, options?: MulterOptions) {
  const Interceptor = class implements NestInterceptor {
    readonly upload = multer(options);

    async intercept(
      request,
      context,
      stream$: Observable<any>,
    ): Promise<Observable<any>> {
      await new Promise((resolve, reject) =>
        this.upload.array(fieldName, maxCount)(request, request.res, err => {
          if (err) {
            return reject(err);
          }
          resolve();
        }),
      );
      return stream$;
    }
  };
  return Interceptor;
}
