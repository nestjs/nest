import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import {
  CallHandler,
  ExecutionContext,
  HttpServer,
  NestInterceptor,
} from '../../interfaces';
import { isNil } from '../../utils/shared.utils';
import {
  CACHE_KEY_METADATA,
  CACHE_MANAGER,
  CACHE_TTL_METADATA,
} from '../cache.constants';

const HTTP_ADAPTER_HOST = 'HttpAdapterHost';
const REFLECTOR = 'Reflector';

export interface HttpAdapterHost<T extends HttpServer = any> {
  httpAdapter: T;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  @Optional()
  @Inject(HTTP_ADAPTER_HOST)
  protected readonly httpAdapterHost: HttpAdapterHost;

  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: any,
    @Inject(REFLECTOR) protected readonly reflector: any,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const key = this.trackBy(context);
    const ttl =
      this.reflector.get(CACHE_TTL_METADATA, context.getHandler()) || null;

    if (!key) {
      return next.handle();
    }
    try {
      const value = await this.cacheManager.get(key);
      if (value) {
        return of(value);
      }

      return next.handle().pipe(
        tap(response => {
          const args = isNil(ttl) ? [key, response] : [key, response, { ttl }];
          this.cacheManager.set(...args);
        }),
      );
    } catch {
      return next.handle();
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!isHttpApp || cacheMetadata) {
      return cacheMetadata;
    }

    const request = context.getArgByIndex(0);
    if (httpAdapter.getRequestMethod(request) !== 'GET') {
      return undefined;
    }
    return httpAdapter.getRequestUrl(request);
  }
}
