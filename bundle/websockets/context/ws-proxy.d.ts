import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';
export declare class WsProxy {
    create(targetCallback: (...args) => Promise<void>, exceptionsHandler: WsExceptionsHandler): (...args) => Promise<void>;
}
