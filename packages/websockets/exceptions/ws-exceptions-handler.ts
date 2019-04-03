import { ArgumentsHost } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { WsException } from '../errors/ws-exception';
import { BaseWsExceptionFilter } from './base-ws-exception-filter';

export class WsExceptionsHandler extends BaseWsExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public handle(exception: Error | WsException | any, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    if (this.invokeCustomFilters(exception, host) || !client.emit) {
      return;
    }
    super.catch(exception, host);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(
    exception: T,
    args: ArgumentsHost,
  ): boolean {
    if (isEmpty(this.filters)) return false;

    const filter = this.filters.find(({ exceptionMetatypes }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        exceptionMetatypes.some(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    filter && filter.func(exception, args);
    return !!filter;
  }
}
