import { ArgumentsHost, Logger, RpcExceptionFilter } from '@nestjs/common';
import { isObject, isError } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception';
import { GrpcException } from './grpc-exceptions';
import { GrpcStatus } from '../enums/grpc-status.enum';

export class BaseRpcExceptionFilter<T = any, R = any>
  implements RpcExceptionFilter<T> {
  private static readonly logger = new Logger('RpcExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): Observable<R> {
    const status = 'error';
    if (exception instanceof RpcException) {
      const res = exception.getError();
      const message = isObject(res) ? res : { status, message: res };
      return _throw(message);
    }
    if (exception instanceof GrpcException) {
      const code = exception.getCode();
      const error = exception.getError();
      const message = isObject(error) ? error : { code, message: error };
      return _throw(message);
    }
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    const loggerArgs = isError(exception)
      ? [exception.message, exception.stack]
      : [exception];
    const logger = BaseRpcExceptionFilter.logger;
    logger.error.apply(logger, loggerArgs as any);

    return _throw({ status, message: errorMessage });
  }
}
