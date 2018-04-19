import { WsExceptionsHandler } from './../exceptions/ws-exceptions-handler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

export class WsProxy {
  public create(
    targetCallback: (client, data) => Promise<void>,
    exceptionsHandler: WsExceptionsHandler,
  ): (client, data) => Promise<void> {
    return async (client, data) => {
      const host = new ExecutionContextHost([client, data]);
      try {
        return await targetCallback(client, data);
      } catch (e) {
        exceptionsHandler.handle(e, host);
      }
    };
  }
}
