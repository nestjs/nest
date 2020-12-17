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

    const { statusCode, message } = this.buildResponse(exception);
    if (host.getType() == 'http') {
      const ctx = host.switchToHttp();
      applicationRef.reply(ctx.getResponse(), message, statusCode);
    } else {
      // Let the RPC / GraphQL framework handle building the response.
      throw exception;
    }
  }

  public buildResponse(exception: T) {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message = isObject(res)
        ? res
        : {
            statusCode: exception.getStatus(),
            message: res,
          };
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: message,
      };
    } else {
      this.logUnknownError(exception);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      };
    }
  }

  public logUnknownError(exception: T) {
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
}
