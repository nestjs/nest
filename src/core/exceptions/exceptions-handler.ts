import { messages } from '../constants';
import { Logger } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception';
import { HttpException } from '@nestjs/common';

export class ExceptionsHandler {
  private static readonly logger = new Logger(ExceptionsHandler.name);
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | HttpException | any, response) {
    if (this.invokeCustomFilters(exception, response)) return;

    if (!(exception instanceof HttpException)) {
      response.status(500).json({
        statusCode: 500,
        message: messages.UNKNOWN_EXCEPTION_MESSAGE,
      });
      if (isObject(exception) && (exception as Error).message) {
        return ExceptionsHandler.logger.error(
          (exception as Error).message,
          (exception as Error).stack,
        );
      }
      return ExceptionsHandler.logger.error(exception);
    }
    const res = exception.getResponse();
    const message = isObject(res)
      ? res
      : {
          statusCode: exception.getStatus(),
          message: res,
        };
    response.status(exception.getStatus()).json(message);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(exception, response): boolean {
    if (isEmpty(this.filters)) return false;

    const filter = this.filters.find(({ exceptionMetatypes, func }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        !!exceptionMetatypes.find(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    filter && filter.func(exception, response);
    return !!filter;
  }
}
