import type { ArgumentsHost } from '@nestjs/common';
import { WsException } from '../errors/ws-exception.js';
import { BaseWsExceptionFilter } from './base-ws-exception-filter.js';
import {
  type ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmpty,
} from '@nestjs/common/internal';
import { InvalidExceptionFilterException } from '@nestjs/core/internal';

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
