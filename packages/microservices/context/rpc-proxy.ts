import {
  from as fromPromise,
  isObservable,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { BaseRpcExceptionFilter } from '../exceptions/base-rpc-exception-filter.js';
import { RpcException } from '../exceptions/rpc-exception.js';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import { ExecutionContextHost } from '@nestjs/core/internal';

const defaultExceptionFilter = new BaseRpcExceptionFilter();

/**
 * Handles what an exception filter threw, or rejected with, while it was
 * handling an error. No filter has handled that, so it is logged and
 * answered as an unknown error. An exception that returns itself from
 * `getError()` is a signal for the transport rather than an error, e.g.
 * `KafkaRetriableException` asking it to deliver the message again, so it
 * is passed on unchanged.
 */
export function handleExceptionFilterFailure(
  error: unknown,
): Observable<never> {
  if (error instanceof RpcException && error.getError() === error) {
    return throwError(() => error);
  }
  return defaultExceptionFilter.handleUnknownError(error, 'error');
}

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
                this.handleStreamError(
                  exceptionsHandler,
                  args,
                  error,
                  reportUnhandledErrors,
                ),
              ),
            );
      } catch (error) {
        // A filter that throws or rejects here rejects the handler promise,
        // which the transport answers as an unknown error and logs
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

  /**
   * Runs the filters for the error of a response stream. What a filter
   * throws, or rejects with, would otherwise become the error of the stream,
   * which the transport cannot tell from an error reply the filter returned.
   */
  private handleStreamError(
    exceptionsHandler: RpcExceptionsHandler,
    args: unknown[],
    error: unknown,
    reportUnhandledErrors: boolean,
  ): Observable<unknown> {
    let result: unknown;
    try {
      result = this.handleError(
        exceptionsHandler,
        args,
        error,
        reportUnhandledErrors,
      );
    } catch (filterError) {
      return handleExceptionFilterFailure(filterError);
    }
    return this.transformToObservable(result);
  }

  // `catchError()` would emit the stream an async filter resolves to, iterate
  // a string or an array, and fail on other plain values. Resolve what the
  // filter returns as when the handler rejects instead.
  private transformToObservable(result: unknown): Observable<unknown> {
    return isObservable(result)
      ? result
      : fromPromise(Promise.resolve(result)).pipe(
          // Ahead of "mergeMap": the error of the stream a filter resolves to
          // is its reply, not a failure of the filter
          catchError(handleExceptionFilterFailure),
          mergeMap(val => (isObservable(val) ? val : of(val))),
        );
  }
}
