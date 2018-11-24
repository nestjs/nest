import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

export class WsProxy {
  public create(
    targetCallback: (...args: any[]) => Promise<void>,
    exceptionsHandler: WsExceptionsHandler,
  ): (...args: any[]) => Promise<void> {
    return async (...args: any[]) => {
      try {
        return await targetCallback(...args);
      } catch (e) {
        const host = new ExecutionContextHost(args);
        exceptionsHandler.handle(e, host);
      }
    };
  }
}
