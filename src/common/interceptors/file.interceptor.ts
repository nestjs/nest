import * as multer from 'multer';
import { NestInterceptor } from './../interfaces/nest-interceptor.interface';
import { Observable } from 'rxjs/Observable';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
import { mixin } from '../decorators/core/component.decorator';

export function FileInterceptor(fieldName: string, options?: MulterOptions) {
  return mixin(
    class implements NestInterceptor {
      readonly upload = multer(options);

      async intercept(
        request,
        context,
        stream$: Observable<any>,
      ): Promise<Observable<any>> {
        await new Promise((resolve, reject) =>
          this.upload.single(fieldName)(request, request.res, err => {
            if (err) {
              return reject(err);
            }
            resolve();
          }),
        );
        return stream$;
      }
    },
  );
}
