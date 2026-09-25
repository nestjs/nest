import { EMPTY, from, isObservable } from 'rxjs';
import { catchError, ignoreElements } from 'rxjs/operators';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler.js';
import { ExecutionContextHost } from '@nestjs/core/internal';

export class WsProxy {
  public create(
    targetCallback: (...args: unknown[]) => Promise<any>,
    exceptionsHandler: WsExceptionsHandler,
    targetPattern?: string,
  ): (...args: unknown[]) => Promise<any> {
    return async (...args: unknown[]) => {
      args = [...args, targetPattern ?? 'unknown'];
      try {
        const result = await targetCallback(...args);
        return !isObservable(result)
          ? result
          : result.pipe(
              catchError(error => {
                const handled = this.handleError(
                  exceptionsHandler,
                  args,
                  error,
                );
                return handled instanceof Promise
                  ? from(handled).pipe(ignoreElements())
                  : EMPTY;
              }),
            );
      } catch (error) {
        await this.handleError(exceptionsHandler, args, error);
      }
    };
  }

  handleError<T>(
    exceptionsHandler: WsExceptionsHandler,
    args: unknown[],
    error: T,
  ): void | Promise<void> {
    const host = new ExecutionContextHost(args);
    host.setType('ws');
    return exceptionsHandler.handle(error as Error, host);
  }
}
