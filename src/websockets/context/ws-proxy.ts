import { WsExceptionsHandler } from './../exceptions/ws-exceptions-handler';

export class WsProxy {
  public create(
    targetCallback: (client, data) => Promise<void>,
    exceptionsHandler: WsExceptionsHandler,
  ): (client, data) => Promise<void> {
    return async (client, data) => {
      try {
        return await targetCallback(client, data);
      } catch (e) {
        exceptionsHandler.handle(e, client);
      }
    };
  }
}
