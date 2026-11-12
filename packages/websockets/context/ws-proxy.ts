import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { EMPTY, from, isObservable } from 'rxjs';
import { catchError, ignoreElements } from 'rxjs/operators';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

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
                const pending = this.handleError(
                  exceptionsHandler,
                  args,
                  error,
                );
                return pending ? from(pending).pipe(ignoreElements()) : EMPTY;
              }),
            );
      } catch (error) {
        // The message is being handled until an asynchronous exception filter
        // is done, which is what the adapters count ("maxConcurrentMessages")
        const pending = this.handleError(exceptionsHandler, args, error);
        if (pending) {
          await pending;
        }
      }
    };
  }

  handleError<T>(
    exceptionsHandler: WsExceptionsHandler,
    args: unknown[],
    error: T,
  ): void | PromiseLike<unknown> {
    const host = new ExecutionContextHost(args);
    host.setType('ws');
    return exceptionsHandler.handle(error as Error, host);
  }
}
