import { MiddlewareFunction } from './middleware.interface';

export interface NestMiddleware {
  resolve(...args): MiddlewareFunction | Promise<MiddlewareFunction>;
}
