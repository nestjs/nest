import { Observable } from 'rxjs/Observable';
import { MulterOptions } from '../interfaces/external/multer-options.interface';
export declare function FileInterceptor(fieldName: string, options?: MulterOptions): {
    new (): {
        readonly upload: any;
        intercept(request: any, context: any, stream$: Observable<any>): Promise<Observable<any>>;
    };
};
