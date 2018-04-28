import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

export class RpcProxy {
  public create(
    targetCallback: (...args) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
  ): (...args) => Promise<Observable<any>> {
    return async (...args) => {
      const host = new ExecutionContextHost(args);
      try {
        return await targetCallback(...args);
      } catch (e) {
        return exceptionsHandler.handle(e, host);
      }
    };
  }
}
