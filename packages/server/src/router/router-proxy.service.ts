import { Injectable, ExceptionsHandler } from '@nest/core';

import { RouterProxyCallback } from '../interfaces';

@Injectable()
export class RouterProxy {
  public createProxy(
    targetCallback: RouterProxyCallback,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return async (...args: any[]) => {
      try {
        await targetCallback(...args);
      } catch (e) {
        const host = '';
        exceptionsHandler.next(e, host);
      }
    };
  }
}
