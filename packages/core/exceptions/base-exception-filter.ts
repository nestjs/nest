import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpServer,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '../constants';

export class BaseExceptionFilter<T = any> implements ExceptionFilter<T> {
  private static readonly logger = new Logger('ExceptionsHandler');

  constructor(protected readonly applicationRef: HttpServer) {}

  catch(exception: T, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      const body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      };
      this.applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);
      if (this.isExceptionObject(exception)) {
        return BaseExceptionFilter.logger.error(
          exception.message,
          exception.stack,
        );
      }
      return BaseExceptionFilter.logger.error(exception);
    }
    const res = exception.getResponse();
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };

    this.applicationRef.reply(
      host.getArgByIndex(1),
      message,
      exception.getStatus(),
    );
  }

  public isExceptionObject(err): err is Error {
    return isObject(err) && !!(err as Error).message;
  }
}
