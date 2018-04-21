import { WsExceptionsHandler } from './../exceptions/ws-exceptions-handler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

export class WsProxy {
  public create(
    targetCallback: (...args) => Promise<void>,
    exceptionsHandler: WsExceptionsHandler,
  ): (...args) => Promise<void> {
    return async (...args) => {
      const host = new ExecutionContextHost(args);
      try {
        return await targetCallback(...args);
      } catch (e) {
        exceptionsHandler.handle(e, host);
      }
    };
  }
}
