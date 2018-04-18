import { messages } from '@nestjs/core/constants';
import { Logger } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { WsException } from '../exceptions/ws-exception';
import { ArgumentsHost } from '@nestjs/common';

export class WsExceptionsHandler {
  private filters: ExceptionFilterMetadata[] = [];

  public handle(exception: Error | WsException | any, args: ArgumentsHost) {
    const client = args.switchToWs().getClient();
    if (this.invokeCustomFilters(exception, args) || !client.emit) return;

    const status = 'error';
    if (!(exception instanceof WsException)) {
      const message = messages.UNKNOWN_EXCEPTION_MESSAGE;
      return client.emit('exception', { status, message });
    }
    const result = exception.getError();
    const message = isObject(result)
      ? result
      : {
          status,
          message: result,
        };
    client.emit('exception', message);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(exception, args: ArgumentsHost): boolean {
    if (isEmpty(this.filters)) return false;

    const filter = this.filters.find(({ exceptionMetatypes, func }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        !!exceptionMetatypes.find(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    filter && filter.func(exception, args);
    return !!filter;
  }
}
