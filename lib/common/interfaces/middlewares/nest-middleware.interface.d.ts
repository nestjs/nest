export declare type MiddlewareFunction = (req, res, next) => any | Promise<any>;
export interface NestMiddleware {
  resolve(...args: any[]): MiddlewareFunction | Promise<MiddlewareFunction>;
}
