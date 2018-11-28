import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import {
  ExecutionContext,
  HttpServer,
  NestInterceptor,
} from '../../interfaces';
import { CACHE_KEY_METADATA, CACHE_MANAGER } from '../cache.constants';

const APPLICATION_REF = 'ApplicationReferenceHost';
const REFLECTOR = 'Reflector';

export interface ApplicationHost<T extends HttpServer = any> {
  applicationRef: T;
}

@Injectable()
export class CacheInterceptor<TManager = any> implements NestInterceptor {
  protected readonly isHttpApp: boolean;

  constructor(
    @Optional()
    @Inject(APPLICATION_REF)
    protected readonly applicationHost: ApplicationHost,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: TManager,
    @Inject(REFLECTOR) protected readonly reflector: any,
  ) {
    const httpServer = applicationHost.applicationRef;
    this.isHttpApp = httpServer && !!httpServer.getRequestMethod;
  }

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
    if (!this.isHttpApp) {
      return this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    }
    const request = context.getArgByIndex(0);
    const httpServer = this.applicationHost.applicationRef;
    if (httpServer.getRequestMethod(request) !== 'GET') {
      return undefined;
    }
    return httpServer.getRequestUrl(request);
  }
}
