import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { Interceptor, NestInterceptor, ExecutionContext } from '';

@Interceptor()
export class TransformInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext, stream$: Observable<any>): Observable<any> {
    return stream$.map((data) => ({ data }));
  }
}
