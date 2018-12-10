import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import {
  CallHandler,
  ExecutionContext,
  HttpServer,
  NestInterceptor,
} from '../../interfaces';
import { CACHE_KEY_METADATA, CACHE_MANAGER } from '../cache.constants';

const APPLICATION_REFERENCE_HOST = 'ApplicationReferenceHost';
const REFLECTOR = 'Reflector';

export interface ApplicationHost<T extends HttpServer = any> {
  applicationRef: T;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  @Optional()
  @Inject(APPLICATION_REFERENCE_HOST)
  protected readonly applicationRefHost: ApplicationHost;

  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: any,
    @Inject(REFLECTOR) protected readonly reflector: any,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const key = this.trackBy(context);
    if (!key) {
      return next.handle();
    }
    try {
      const value = await this.cacheManager.get(key);
      if (value) {
        return of(value);
      }
      return next
        .handle()
        .pipe(tap(response => this.cacheManager.set(key, response)));
    } catch {
      return next.handle();
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
