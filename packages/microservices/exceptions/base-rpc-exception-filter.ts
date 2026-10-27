import {
  type ArgumentsHost,
  IntrinsicException,
  Logger,
  type RpcExceptionFilter,
} from '@nestjs/common';
import { Observable, throwError as _throw } from 'rxjs';
import { RpcException } from './rpc-exception.js';
import { isObject } from '@nestjs/common/internal';
import { MESSAGES } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class BaseRpcExceptionFilter<
  T = any,
  R = any,
> implements RpcExceptionFilter<T> {
  protected static readonly logger = new Logger('RpcExceptionsHandler');

  public catch(exception: T, host: ArgumentsHost): Observable<R> {
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      return this.handleUnknownError(exception, status);
    }
    const res = exception.getError();
    // An Error, as in `new RpcException(err)`, would be sent with its
    // enumerable properties, e.g. the request config of an HTTP client error.
    // An exception that returns itself from `getError()` is a control signal
    // rather than a held error: `KafkaRetriableException` uses it to ask the
    // transport to redeliver the message, so it has to keep travelling.
    if (res instanceof Error && res !== exception) {
      return this.handleUnknownError(res as T, status);
    }
    const message = isObject(res) ? res : { status, message: res };
    return _throw(() => message);
  }

  public handleUnknownError(exception: T, status: string) {
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseRpcExceptionFilter.logger;
      logger.error(exception);
    }

    return _throw(() => ({ status, message: errorMessage }));
  }

  public isError(exception: any): exception is Error {
    return !!(isObject(exception) && (exception as Error).message);
  }
}
