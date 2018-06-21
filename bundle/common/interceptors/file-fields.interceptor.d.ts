import * as multer from 'multer';
import { Observable } from 'rxjs';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
import { ExecutionContext } from '../interfaces';
export declare function FileFieldsInterceptor(uploadFields: multer.Field[], options?: MulterOptions): {
    new (): {
        readonly upload: any;
        intercept(context: ExecutionContext, call$: Observable<any>): Promise<Observable<any>>;
    };
};
