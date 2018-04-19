export type MiddlewareFunction = (req, res, next) => any | Promise<any>;
export interface NestMiddleware {
  resolve(...args): MiddlewareFunction | Promise<MiddlewareFunction>;
}
