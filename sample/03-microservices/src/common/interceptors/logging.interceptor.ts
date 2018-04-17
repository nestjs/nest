import { Injectable, NestInterceptor, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    call$: Observable<any>,
  ): Observable<any> {
    console.log('Before...');

    const now = Date.now();
    return call$.pipe(tap(() => console.log(`After... ${Date.now() - now}ms`)));
  }
}
