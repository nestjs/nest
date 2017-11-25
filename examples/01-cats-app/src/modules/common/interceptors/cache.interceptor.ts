import 'rxjs/add/observable/of';

import {ExecutionContext, Interceptor, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs/Observable';

@Interceptor()
export abstract class CacheInterceptor implements NestInterceptor {
  protected abstract readonly isCached: () => boolean;

  intercept(dataOrRequest, context: ExecutionContext,
            stream$: Observable<any>): Observable<any> {
    if (this.isCached()) {
      return Observable.of([]);
    }
    return stream$;
  }
}