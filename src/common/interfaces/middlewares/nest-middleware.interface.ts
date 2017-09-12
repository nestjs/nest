import { ExpressMiddleware } from './express-midleware.interface';

export type AsyncExpressMiddleware = Promise<ExpressMiddleware>;
export interface NestMiddleware {
    resolve(...args): ExpressMiddleware | AsyncExpressMiddleware | Promise<AsyncExpressMiddleware>;
}