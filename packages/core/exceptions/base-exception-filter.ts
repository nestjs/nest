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

    if (!(exception instanceof HttpException)) {
      const body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      };
      applicationRef.status(host.getArgByIndex(1), body.statusCode);
      applicationRef.reply(host.getArgByIndex(1), body);
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

    applicationRef.status(host.getArgByIndex(1), exception.getStatus());
    applicationRef.reply(host.getArgByIndex(1), message);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }
}
