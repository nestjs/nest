import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpServer,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '../adapters';
import { MESSAGES } from '../constants';
import { HttpAdapterHost } from '../helpers';

export class BaseExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger('ExceptionsHandler');

  @Optional()
  @Inject()
  protected readonly httpAdapterHost?: HttpAdapterHost;

  constructor(protected readonly applicationRef?: HttpServer) {}

  catch(exception: T, host: ArgumentsHost) {
    const applicationRef =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

    if (!(exception instanceof HttpException)) {
      return this.handleUnknownError(exception, host, applicationRef);
    }
    const res = exception.getResponse();
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

    applicationRef.reply(host.getArgByIndex(1), message, exception.getStatus());
  }

  public handleUnknownError(
    exception: T,
    host: ArgumentsHost,
    applicationRef: AbstractHttpAdapter | HttpServer,
  ) {
    const body = this.isHttpError(exception)
      ? {
          statusCode: exception.statusCode,
          message: exception.message,
        }
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
        };
    applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);
    if (this.isExceptionObject(exception)) {
      return BaseExceptionFilter.logger.error(
        exception.message,
        exception.stack,
      );
    }
    return BaseExceptionFilter.logger.error(exception);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Checks if the thrown error comes from the "http-errors" library.
   * @param err error object
   */
  public isHttpError(err: any): err is { statusCode: number; message: string } {
    return err?.statusCode && err?.message;
  }
}
