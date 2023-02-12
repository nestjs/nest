/* eslint-disable prefer-spread */
import { ArgumentsHost, Logger, RpcExceptionFilter } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception';

/**
 * @publicApi
 */
export class BaseRpcExceptionFilter<T = any, R = any>
  implements RpcExceptionFilter<T>
{
  private static readonly logger = new Logger('RpcExceptionsHandler');

  public catch(exception: T, host: ArgumentsHost): Observable<R> {
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      return this.handleUnknownError(exception, status);
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
    return _throw(() => message);
  }

  public handleUnknownError(exception: T, status: string) {
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    const loggerArgs = this.isError(exception)
      ? [exception.message, exception.stack]
      : [exception];
    const logger = BaseRpcExceptionFilter.logger;
    logger.error.apply(logger, loggerArgs as any);

    return _throw(() => ({ status, message: errorMessage }));
  }

  public isError(exception: any): exception is Error {
    return !!(isObject(exception) && (exception as Error).message);
  }
}
