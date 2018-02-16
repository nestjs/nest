import { Injectable, NestInterceptor, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    dataOrRequest,
    context: ExecutionContext,
    stream$: Observable<any>,
  ): Observable<any> {
    return stream$.pipe(map(data => ({ data })));
  }
}
