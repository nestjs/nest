import { Logger } from '@nestjs/common';
import { isObservable, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RpcException } from '../exceptions/rpc-exception.js';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import { ExecutionContextHost } from '@nestjs/core/internal';

export class RpcProxy {
  private static readonly logger = new Logger('RpcExceptionsHandler');

  public create(
    targetCallback: (...args: unknown[]) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
    isEventHandler = false,
  ): (...args: unknown[]) => Promise<Observable<unknown>> {
    return async (...args: unknown[]) => {
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(
              catchError(error =>
                this.handleError(
                  exceptionsHandler,
                  args,
                  error,
                  isEventHandler,
                ),
              ),
            );
      } catch (error) {
        return this.handleError(exceptionsHandler, args, error, isEventHandler);
      }
    };
  }

  handleError<T>(
    exceptionsHandler: RpcExceptionsHandler,
    args: unknown[],
    error: T,
    isEventHandler = false,
  ): Observable<unknown> {
    const host = new ExecutionContextHost(args);
    host.setType('rpc');

    // An `RpcException` is the only shape the handler does not log on its own,
    // and an event has no response stream to carry it back, so it would
    // otherwise be lost.
    const shouldReport = isEventHandler && error instanceof RpcException;
    const result = exceptionsHandler.handle(error as Error, host);
    return shouldReport
      ? result.pipe(tap({ error: () => RpcProxy.logger.error(error) }))
      : result;
  }
}
