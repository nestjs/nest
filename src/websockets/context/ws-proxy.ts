import { WsExceptionsHandler } from './../exceptions/ws-exceptions-handler';

export class WsProxy {
    public create(
        targetCallback: (client: any, data: any) => Promise<void>,
        exceptionsHandler: WsExceptionsHandler): (client: any, data: any) => Promise<void> {

        return async (client, data) => {
            try {
                return await targetCallback(client, data);
            }
            catch (e) {
                exceptionsHandler.handle(e, client);
            }
        };
    }
}
