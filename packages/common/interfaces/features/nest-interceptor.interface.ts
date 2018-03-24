import { Observable } from 'rxjs/Observable';
import { ExecutionContext } from './execution-context.interface';

export interface NestInterceptor<T = any, R = any> {
  intercept(
    dataOrRequest,
    context: ExecutionContext,
    stream$: Observable<T>,
  ): Observable<R> | Promise<Observable<R>>;
}
