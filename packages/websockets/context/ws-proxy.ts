import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { empty } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

export class WsProxy {
  public create(
    targetCallback: (...args: any[]) => Promise<any>,
    exceptionsHandler: WsExceptionsHandler,
  ): (...args: any[]) => Promise<any> {
    return async (...args: any[]) => {
      try {
        const result = await targetCallback(...args);
        return !this.isObservable(result)
          ? result
          : result.pipe(
              catchError(error => {
                this.handleError(exceptionsHandler, args, error);
                return empty();
              }),
            );
      } catch (error) {
        this.handleError(exceptionsHandler, args, error);
      }
    };
  }

  handleError<T>(
    exceptionsHandler: WsExceptionsHandler,
    args: any[],
    error: T,
  ) {
    const host = new ExecutionContextHost(args);
    host.setType('ws');
    exceptionsHandler.handle(error, host);
  }

  isObservable(result: any): boolean {
    return result && isFunction(result.subscribe);
  }
}
