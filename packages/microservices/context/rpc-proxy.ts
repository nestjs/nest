import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

export class RpcProxy {
  public create(
    targetCallback: (...args: any[]) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
  ): (...args: any[]) => Promise<Observable<any>> {
    return async (...args: any[]) => {
      try {
        const result = await targetCallback(...args);
        return !this.isObservable(result)
          ? result
          : result.pipe(
              catchError(error =>
                this.handleError(exceptionsHandler, args, error),
              ),
            );
      } catch (error) {
        return this.handleError(exceptionsHandler, args, error);
      }
    };
  }

  handleError<T>(
    exceptionsHandler: RpcExceptionsHandler,
    args: any[],
    error: T,
  ): Observable<any> {
    const host = new ExecutionContextHost(args);
    host.setType('rpc');
    return exceptionsHandler.handle(error, host);
  }

  isObservable(result: any): boolean {
    return result && isFunction(result.subscribe);
  }
}
