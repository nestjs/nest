import 'rxjs/add/observable/of';
import { Observable } from 'rxjs/Observable';
import { Interceptor, NestInterceptor, ExecutionContext } from '';

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
