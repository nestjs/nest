import * as multer from 'multer';
import { NestInterceptor } from './../interfaces/features/nest-interceptor.interface';
import { Observable } from 'rxjs/Observable';
import { MulterOptions } from '../interfaces/external/multer-options.interface';

export function FileInterceptor(fieldName: string, options?: MulterOptions) {
  const Interceptor = class implements NestInterceptor {
    readonly upload = multer(options);

    async intercept(
      request,
      context,
      stream$: Observable<any>,
    ): Promise<Observable<any>> {
      await new Promise((resolve, reject) =>
        this.upload.single(fieldName)(request, request.res, resolve),
      );
      return stream$;
    }
  };
  return Interceptor;
}
