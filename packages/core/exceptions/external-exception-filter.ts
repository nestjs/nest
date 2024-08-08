import { ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { inspect } from 'util';

export class ExternalExceptionFilter<T = any, R = any> {
  private static readonly logger = new Logger('ExceptionsHandler');

  catch(exception: T, host: ArgumentsHost): R | Promise<R> {
    if (exception instanceof Error && !(exception instanceof HttpException)) {
      ExternalExceptionFilter.logger.error(
        exception.message,
        inspect(exception),
      );
    }
    throw exception;
  }
}
