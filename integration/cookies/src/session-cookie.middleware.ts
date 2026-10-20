import { Injectable, NestMiddleware } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

export const MIDDLEWARE_COOKIE_HEADER = 'x-middleware-cookie';

/**
 * Sets a cookie with `setCookie()` on the raw response that a Nest
 * middleware receives, before the handler sets its own cookies.
 */
@Injectable()
export class SessionCookieMiddleware implements NestMiddleware {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  use(req: any, res: any, next: () => void) {
    if (req.headers[MIDDLEWARE_COOKIE_HEADER]) {
      this.adapterHost.httpAdapter.setCookie(res, 'session', 'abc');
    }
    next();
  }
}
