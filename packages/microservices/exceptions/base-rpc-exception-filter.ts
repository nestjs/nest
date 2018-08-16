import { ArgumentsHost, Logger, RpcExceptionFilter } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { messages } from '@nestjs/core/constants';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception';

export class BaseRpcExceptionFilter<T = any, R = any>
  implements RpcExceptionFilter<T> {
  private static readonly logger = new Logger('RpcExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): Observable<R> {
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      const errorMessage = messages.UNKNOWN_EXCEPTION_MESSAGE;

      const isError = isObject(exception) && (exception as Error).message;
      const loggerArgs = isError
        ? [
            ((exception as any) as Error).message,
            ((exception as any) as Error).stack,
          ]
        : [exception];
      const logger = BaseRpcExceptionFilter.logger;
      logger.error.apply(logger, loggerArgs);

      return _throw({ status, message: errorMessage });
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
    return _throw(message);
  }
}
