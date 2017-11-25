import { ExpressMiddleware } from './express-middleware.interface';
export declare type AsyncExpressMiddleware = Promise<ExpressMiddleware>;
export interface NestMiddleware {
    resolve(...args: any[]): ExpressMiddleware | AsyncExpressMiddleware | Promise<AsyncExpressMiddleware>;
}
