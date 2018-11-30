import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import { ExecutionContext, NestInterceptor } from '../../interfaces';
import { CACHE_KEY_METADATA, CACHE_MANAGER } from '../cache.constants';

const APPLICATION_REFERENCE_HOST = 'ApplicationReferenceHost';
const REFLECTOR = 'Reflector';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  @Optional()
  @Inject(APPLICATION_REFERENCE_HOST)
  protected readonly applicationRefHost: any;

  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: any,
    @Inject(REFLECTOR) protected readonly reflector: any,
  ) {}

  async intercept(
    context: ExecutionContext,
    call$: Observable<any>,
  ): Promise<Observable<any>> {
    const key = this.trackBy(context);
    if (!key) {
      return call$;
    }
    try {
      const value = await this.cacheManager.get(key);
      if (value) {
        return of(value);
      }
      return call$.pipe(
        tap((response: any) => this.cacheManager.set(key, response)),
      );
    } catch {
      return call$;
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const httpServer = this.applicationRefHost.applicationRef;
    const isHttpApp = httpServer && !!httpServer.getRequestMethod;

    if (!isHttpApp) {
      return this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    }
    const request = context.getArgByIndex(0);
    if (httpServer.getRequestMethod(request) !== 'GET') {
      return undefined;
    }
    return httpServer.getRequestUrl(request);
  }
}
