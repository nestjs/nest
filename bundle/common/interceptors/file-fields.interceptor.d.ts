import { Observable } from 'rxjs';
import { ExecutionContext } from '../interfaces';
import { MulterField, MulterOptions } from '../interfaces/external/multer-options.interface';
export declare function FileFieldsInterceptor(uploadFields: MulterField[], options?: MulterOptions): {
    new (): {
        readonly upload: any;
        intercept(context: ExecutionContext, call$: Observable<any>): Promise<Observable<any>>;
    };
};
