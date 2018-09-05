import { CacheInterceptor, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const isGetRequest = this.httpServer.getRequestMethod(request) === 'GET';
    const excludePaths = [];
    if (
      !isGetRequest ||
      (isGetRequest && excludePaths.includes(this.httpServer.getRequestUrl))
    ) {
      return undefined;
    }
    return this.httpServer.getRequestUrl(request);
  }
}
