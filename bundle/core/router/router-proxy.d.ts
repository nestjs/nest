import { ExceptionsHandler } from '../exceptions/exceptions-handler';
export declare type RouterProxyCallback = (req?, res?, next?) => void;
export declare class RouterProxy {
    createProxy(targetCallback: RouterProxyCallback, exceptionsHandler: ExceptionsHandler): (req: any, res: any, next: any) => Promise<void>;
    createExceptionLayerProxy(targetCallback: (err, req, res, next) => void, exceptionsHandler: ExceptionsHandler): (err: any, req: any, res: any, next: any) => Promise<void>;
}
