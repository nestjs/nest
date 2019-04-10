import {
  Logger,
  RpcExceptionFilter,
  ArgumentsHost,
  Catch,
} from '@nestjs/common';
import { isError, isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';

import { Observable, throwError } from 'rxjs';

import { GrpcException } from './grpc-exceptions';
import { GrpcStatus } from 'enums/grpc-status.enum';

@Catch()
export class GrpcExceptionFilter<T = any, R = any>
  implements RpcExceptionFilter<T> {
  private static readonly logger = new Logger('GrpcExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): Observable<R> {
    if (!(exception instanceof GrpcException)) {
      const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;
      const loggerArgs = isError(exception)
        ? [exception.message, exception.stack]
        : [exception];

      const logger = GrpcExceptionFilter.logger;
      logger.error.apply(logger, loggerArgs as any);

      return throwError({ code: GrpcStatus.UNKNOWN, message: errorMessage });
    }
    const code = exception.getCode();
    const error = exception.getError();
    const message = isObject(error) ? error : { code, message: error };
    return throwError(message);
  }
}
