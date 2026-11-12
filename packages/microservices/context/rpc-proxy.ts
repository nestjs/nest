import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import {
  from as fromPromise,
  isObservable,
  Observable,
  ObservableInput,
  throwError,
} from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseRpcExceptionFilter } from '../exceptions/base-rpc-exception-filter';
import { RpcException } from '../exceptions/rpc-exception';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

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
  ): (...args: unknown[]) => Promise<Observable<unknown>> {
    return async (...args: unknown[]) => {
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(
              catchError(error =>
                this.handleStreamError(exceptionsHandler, args, error),
              ),
            );
      } catch (error) {
        // A filter that throws or rejects here rejects the handler promise,
        // which is left to the transport
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

  /**
   * Runs the filters for the error of a response stream. What a filter
   * throws, or rejects with, would otherwise become the error of the stream,
   * which the transport cannot tell from an error reply the filter returned.
   */
  private handleStreamError(
    exceptionsHandler: RpcExceptionsHandler,
    args: unknown[],
    error: unknown,
  ): ObservableInput<unknown> {
    let result: unknown;
    try {
      result = this.handleError(exceptionsHandler, args, error);
    } catch (filterError) {
      return handleExceptionFilterFailure(filterError);
    }
    // What an async filter resolves to is still its reply
    return result instanceof Promise
      ? fromPromise(result).pipe(catchError(handleExceptionFilterFailure))
      : (result as ObservableInput<unknown>);
  }
}
