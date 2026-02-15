import {
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  type HttpServer,
  HttpStatus,
  Inject,
  IntrinsicException,
  Logger,
  Optional,
} from '@nestjs/common';
import { AbstractHttpAdapter } from '../adapters/index.js';
import { MESSAGES } from '../constants.js';
import { HttpAdapterHost } from '../helpers/http-adapter-host.js';
import { isObject } from '@nestjs/common/internal';

export class BaseExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger('ExceptionsHandler');

  @Optional()
  @Inject()
  protected readonly httpAdapterHost?: HttpAdapterHost;

  constructor(protected readonly applicationRef?: HttpServer) {}

  catch(exception: T, host: ArgumentsHost) {
    const applicationRef =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter)!;

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

    const response = host.getArgByIndex(1);
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, message, exception.getStatus());
    } else {
      applicationRef.end(response);
    }
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

    const response = host.getArgByIndex(1);
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, body, body.statusCode);
    } else {
      applicationRef.end(response);
    }

    if (!(exception instanceof IntrinsicException)) {
      BaseExceptionFilter.logger.error(exception);
    }
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
