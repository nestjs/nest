import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { isObservable, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

export class RpcProxy {
  public create(
    targetCallback: (...args: unknown[]) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
  ): (...args: unknown[]) => Promise<Observable<unknown>> {
    return async (...args: unknown[]) => {
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
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
    args: unknown[],
    error: T,
  ): Observable<unknown> {
    const host = new ExecutionContextHost(args);
    host.setType('rpc');
    return exceptionsHandler.handle(error as Error, host);
  }
}
