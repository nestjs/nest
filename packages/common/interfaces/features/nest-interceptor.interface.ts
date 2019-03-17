import { Observable } from 'rxjs';
import { ExecutionContext } from './execution-context.interface';

export interface CallHandler<T = any> {
  handle(): Observable<T>;
}

export interface NestInterceptor<T = any, R = any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<R> | Promise<Observable<R>>;
}
