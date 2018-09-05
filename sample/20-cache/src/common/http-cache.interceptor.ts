import { CacheInterceptor, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const excludePaths = [];
    if (
      this.httpServer.getRequestMethod(request) !== 'GET' ||
      excludePaths.includes(this.httpServer.getRequestUrl)
    ) {
      return undefined;
    }
    return this.httpServer.getRequestUrl(request);
  }
}
