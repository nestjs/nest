import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import {
  ExecutionContext,
  HttpServer,
  NestInterceptor,
} from '../../interfaces';
import { CACHE_KEY_METADATA, CACHE_MANAGER } from '../cache.constants';

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const HTTP_SERVER_REF = 'HTTP_SERVER_REF';
const REFLECTOR = 'Reflector';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly isHttpApp: boolean;

  constructor(
    @Optional()
    @Inject(HTTP_SERVER_REF)
    private readonly httpServer: HttpServer,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
    @Inject(REFLECTOR) private readonly reflector,
  ) {
    this.isHttpApp = httpServer && !!httpServer.getRequestMethod;
  }

  async intercept(
    context: ExecutionContext,
    call$: Observable<any>,
  ): Promise<Observable<any>> {
    const key = this.getCacheKey(context);
    if (!key) {
      return call$;
    }
    try {
      const value = await this.cacheManager.get(key);
      if (value) {
        return of(value);
      }
      return call$.pipe(tap(response => this.cacheManager.set(key, response)));
    } catch {
      return call$;
    }
  }

  getCacheKey(context: ExecutionContext): string | undefined {
    if (!this.isHttpApp) {
      return this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    }
    const request = context.getArgByIndex(0);
    if (this.httpServer.getRequestMethod(request) !== 'GET') {
      return undefined;
    }
    return this.httpServer.getRequestUrl(context.getArgByIndex(0));
  }
}
