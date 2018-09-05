import { CacheInterceptor, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    if (!this.isHttpApp) {
      return this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    }
    const request = context.getArgByIndex(0);
    const excludePaths = [];
    if (
      this.httpServer.getRequestMethod(request) !== 'GET' ||
      excludePaths.includes(this.httpServer.getRequestUrl)
    ) {
      return undefined;
    }
    return this.httpServer.getRequestUrl(context.getArgByIndex(0));
  }
}
