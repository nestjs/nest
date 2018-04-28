import { MiddlewareFunction } from './middleware.interface';
export interface NestMiddleware {
    resolve(...args: any[]): MiddlewareFunction | Promise<MiddlewareFunction>;
}
