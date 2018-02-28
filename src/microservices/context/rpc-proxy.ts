import { Observable } from 'rxjs/Observable';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

export class RpcProxy {
  public create(
    targetCallback: (...args) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
  ): (...args) => Promise<Observable<any>> {
    return async (...args) => {
      try {
        return await targetCallback(...args);
      } catch (e) {
        return exceptionsHandler.handle(e);
      }
    };
  }
}
