import { WsExceptionsHandler } from './../exceptions/ws-exceptions-handler';
export declare class WsProxy {
    create(targetCallback: (client, data) => Promise<void>, exceptionsHandler: WsExceptionsHandler): (client, data) => Promise<void>;
}
