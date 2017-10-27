import { ExecutionContext, Interceptor, NestInterceptor } from '@nestjs/core';
import 'rxjs/add/observable/of';
import { Observable } from 'rxjs/Observable';

@Interceptor()
export class CacheInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext, stream$: Observable<any>): Observable<any> {
    const isCached = true;
    if (isCached) {
      return Observable.of([]);
    }
    return stream$;
  }
}
