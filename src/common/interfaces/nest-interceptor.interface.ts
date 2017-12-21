import { ExecutionContext } from './execution-context.interface';
import { Observable } from 'rxjs/Observable';
import { Request } from 'express';

export interface NestInterceptor {
  intercept(dataOrRequest: Request | any, context: ExecutionContext, stream$: Observable<any>): Observable<any> | Promise<Observable<any>>;
}
