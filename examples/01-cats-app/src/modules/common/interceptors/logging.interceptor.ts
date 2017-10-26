import 'rxjs/add/operator/do';
import { Observable } from 'rxjs/Observable';
import { Interceptor, NestInterceptor, ExecutionContext } from '';

@Interceptor()
export class LoggingInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext, stream$: Observable<any>): Observable<any> {
    console.log('Before...');
    const now = Date.now();

    return stream$.do(
      () => console.log(`After... ${Date.now() - now}ms`),
    );
  }
}
