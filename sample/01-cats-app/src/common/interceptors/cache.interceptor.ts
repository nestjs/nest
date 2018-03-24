import { Injectable, NestInterceptor, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

@Injectable()
export abstract class CacheInterceptor implements NestInterceptor {
  protected abstract readonly isCached: () => boolean;

  intercept(
    dataOrRequest,
    context: ExecutionContext,
    stream$: Observable<any>,
  ): Observable<any> {
    if (this.isCached()) {
      return of([]);
    }
    return stream$;
  }
}
