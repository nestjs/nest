import { ExpressMiddleware } from './express-middleware.interface';

export type AsyncExpressMiddleware = Promise<ExpressMiddleware>;
export interface NestMiddleware {
    resolve(...args): ExpressMiddleware | AsyncExpressMiddleware | Promise<AsyncExpressMiddleware>;
}
