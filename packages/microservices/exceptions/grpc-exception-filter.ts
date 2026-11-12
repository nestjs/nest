import {
  type ArgumentsHost,
  Catch,
  IntrinsicException,
  Logger,
  type RpcExceptionFilter,
} from '@nestjs/common';
import { isNumber, isObject } from '@nestjs/common/internal';
import { MESSAGES } from '@nestjs/core/internal';
import { Observable, throwError } from 'rxjs';
import { GrpcStatus } from '../enums/grpc-status.enum.js';
import { GrpcException, type GrpcExceptionBody } from './grpc-exception.js';
import { RpcException } from './rpc-exception.js';

/**
 * @publicApi
 */
@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter {
  private static readonly logger = new Logger('RpcExceptionsHandler');

  public catch(
    exception: unknown,
    host: ArgumentsHost,
  ): Observable<GrpcExceptionBody> {
    if (exception instanceof GrpcException) {
      return throwError(() => exception.getError());
    }

    if (exception instanceof RpcException) {
      return throwError(() => this.serializeRpcException(exception));
    }

    return throwError(() => ({
      code: GrpcStatus.UNKNOWN,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    }));
  }

  private serializeRpcException(exception: RpcException): GrpcExceptionBody {
    const error = exception.getError();

    // An Error, as in `new RpcException(err)`, was not written for the
    // caller: its message, and its "details" and "metadata" if it has them,
    // would be sent with the status. As in `BaseRpcExceptionFilter`, it is
    // logged and answered as an unknown error, except that its numeric "code"
    // or "status" is still used as the status. An exception that returns
    // itself from `getError()` holds no error other than its own.
    if (error instanceof Error && error !== exception) {
      if (!(error instanceof IntrinsicException)) {
        GrpcExceptionFilter.logger.error(error);
      }
      const code = this.getErrorCode(error);
      return {
        code: isNumber(code) ? code : GrpcStatus.UNKNOWN,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      };
    }

    if (isObject(error)) {
      const code = this.getErrorCode(error);

      if (isNumber(code)) {
        return {
          ...error,
          code,
          message: exception.message,
        } as GrpcExceptionBody;
      }
    }

    return {
      code: GrpcStatus.UNKNOWN,
      message: exception.message,
    };
  }

  private getErrorCode(error: object): number | undefined {
    const { code, status } = error as Record<string, unknown>;

    if (isNumber(code)) {
      return code;
    }
    if (isNumber(status)) {
      return status;
    }
  }
}
