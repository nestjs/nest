import {
  type ArgumentsHost,
  Catch,
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
