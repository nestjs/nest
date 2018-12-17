import { Injectable, MiddlewareFunction, NestMiddleware } from '@nestjs/common';
import { AsyncContext } from './async-context';

@Injectable()
export class AsyncHooksMiddleware implements NestMiddleware {
  constructor(private readonly asyncContext: AsyncContext) {}

  resolve(...args: any[]): MiddlewareFunction {
    return (req: any, res: any, next: Function) => this.asyncContext.run(next);
  }
}
