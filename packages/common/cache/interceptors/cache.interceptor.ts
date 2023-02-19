import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../../decorators';
import { StreamableFile } from '../../file-stream';
import {
  CallHandler,
  ExecutionContext,
  HttpServer,
  NestInterceptor,
} from '../../interfaces';
import { Logger } from '../../services/logger.service';
import { loadPackage } from '../../utils/load-package.util';
import { isFunction, isNil, isNumber } from '../../utils/shared.utils';
import {
  CACHE_KEY_METADATA,
  CACHE_MANAGER,
  CACHE_TTL_METADATA,
} from '../cache.constants';

const HTTP_ADAPTER_HOST = 'HttpAdapterHost';
const REFLECTOR = 'Reflector';

// We need to check if the cache-manager package is v5 or greater
// because the set method signature changed in v5
const cacheManager = loadPackage('cache-manager', 'CacheModule', () =>
  require('cache-manager'),
);
const cacheManagerIsv5OrGreater = 'memoryStore' in cacheManager;

export interface HttpAdapterHost<T extends HttpServer = any> {
  httpAdapter: T;
}

/**
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @publicApi
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  @Optional()
  @Inject(HTTP_ADAPTER_HOST)
  protected readonly httpAdapterHost: HttpAdapterHost;

  protected allowedMethods = ['GET'];
  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: any,
    @Inject(REFLECTOR) protected readonly reflector: any,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const key = this.trackBy(context);
    const ttlValueOrFactory =
      this.reflector.get(CACHE_TTL_METADATA, context.getHandler()) ?? null;

    if (!key) {
      return next.handle();
    }
    try {
      const value = await this.cacheManager.get(key);
      if (!isNil(value)) {
        return of(value);
      }
      const ttl = isFunction(ttlValueOrFactory)
        ? await ttlValueOrFactory(context)
        : ttlValueOrFactory;
      return next.handle().pipe(
        tap(async response => {
          if (response instanceof StreamableFile) {
            return;
          }

          const args = [key, response];
          if (!isNil(ttl)) {
            args.push(cacheManagerIsv5OrGreater ? ttl : { ttl });
          }

          try {
            await this.cacheManager.set(...args);
          } catch (err) {
            Logger.error(
              `An error has occurred when inserting "key: ${key}", "value: ${response}"`,
              'CacheInterceptor',
            );
          }
        }),
      );
    } catch {
      return next.handle();
    }
  }

  protected trackBy(context: ExecutionContext): string | undefined {
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
    if (!this.isRequestCacheable(context)) {
      return undefined;
    }
    return httpAdapter.getRequestUrl(request);
  }

  protected isRequestCacheable(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    return this.allowedMethods.includes(req.method);
  }
}
