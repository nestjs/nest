/**
 * @see [Middleware](https://docs.nestjs.com/middleware)
 *
 * @publicApi
 */
export interface NestMiddleware<TRequest = any, TResponse = any> {
  use(req: TRequest, res: TResponse, next: (error?: any) => void): any;
}
