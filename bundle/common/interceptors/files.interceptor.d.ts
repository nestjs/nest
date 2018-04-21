import { Observable } from 'rxjs/Observable';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
import { ExecutionContext } from './../interfaces';
export declare function FilesInterceptor(fieldName: string, maxCount?: number, options?: MulterOptions): {
    new (): {
        readonly upload: any;
        intercept(context: ExecutionContext, call$: Observable<any>): Promise<Observable<any>>;
    };
};
