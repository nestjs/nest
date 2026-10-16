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
                this.transformToObservable(
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

  // `catchError()` would emit the stream an async filter resolves to, iterate
  // a string or an array, and fail on other plain values. Resolve what the
  // filter returns as when the handler rejects instead.
  private transformToObservable(result: unknown): Observable<unknown> {
    return isObservable(result)
      ? result
      : fromPromise(Promise.resolve(result)).pipe(
          mergeMap(val => (isObservable(val) ? val : of(val))),
        );
  }
}
