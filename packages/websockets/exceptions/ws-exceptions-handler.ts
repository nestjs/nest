import { ArgumentsHost } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface.js';
import { selectExceptionFilterMetadata } from '@nestjs/common/utils/select-exception-filter-metadata.util.js';
import { isEmpty } from '@nestjs/common/utils/shared.utils.js';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception.js';
import { WsException } from '../errors/ws-exception.js';
import { BaseWsExceptionFilter } from './base-ws-exception-filter.js';

/**
 * @publicApi
 */
export class WsExceptionsHandler extends BaseWsExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public handle(exception: Error | WsException, host: ArgumentsHost) {
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

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    filter && filter.func(exception, args);
    return !!filter;
  }
}
