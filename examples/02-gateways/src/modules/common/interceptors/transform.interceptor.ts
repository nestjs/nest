import { ExecutionContext, Interceptor, NestInterceptor } from '@nestjs/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

@Interceptor()
export class TransformInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext, stream$: Observable<any>): Observable<any> {
    return stream$.map((data) => ({ data }));
  }
}
