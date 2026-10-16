import { from as fromPromise, isObservable, Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import { ExecutionContextHost } from '@nestjs/core/internal';

export class RpcProxy {
  public create(
    targetCallback: (...args: unknown[]) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
    reportUnhandledErrors = false,
  ): (...args: unknown[]) => Promise<Observable<unknown>> {
    return async (...args: unknown[]) => {
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(
              catchError(error =>
                this.flattenAsyncResult(
                  this.handleError(
                    exceptionsHandler,
                    args,
                    error,
                    reportUnhandledErrors,
                  ),
                ),
              ),
            );
      } catch (error) {
        return this.handleError(
          exceptionsHandler,
          args,
          error,
          reportUnhandledErrors,
        );
      }
    };
  }

  handleError<T>(
    exceptionsHandler: RpcExceptionsHandler,
    args: unknown[],
    error: T,
    reportUnhandledErrors = false,
  ): Observable<unknown> {
    const host = new ExecutionContextHost(args);
    host.setType('rpc');
    return exceptionsHandler.handle(
      error as Error,
      host,
      reportUnhandledErrors,
    );
  }

  // An async filter resolves to its stream, which `catchError()` would emit as
  // a value. The server subscribes to it instead when the handler rejects.
  private flattenAsyncResult(
    result: Observable<unknown> | Promise<unknown>,
  ): Observable<unknown> {
    return result instanceof Promise
      ? fromPromise(result).pipe(
          mergeMap(val => (isObservable(val) ? val : of(val))),
        )
      : result;
  }
}
