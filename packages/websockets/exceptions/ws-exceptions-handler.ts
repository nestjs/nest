import type { ArgumentsHost } from '@nestjs/common';
import { WsException } from '../errors/ws-exception.js';
import { BaseWsExceptionFilter } from './base-ws-exception-filter.js';
import {
  type ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmptyArray,
} from '@nestjs/common/internal';
import { InvalidExceptionFilterException } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class WsExceptionsHandler extends BaseWsExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  /**
   * Returns what the matching custom filter returns, so that callers can
   * await an asynchronous filter: its rejection is then reported the same
   * way as a filter that throws synchronously, instead of becoming an
   * unhandled rejection.
   */
  public handle(
    exception: Error | WsException,
    host: ArgumentsHost,
  ): void | Promise<void> {
    const filter = this.selectCustomFilter(exception);
    if (filter) {
      return filter.func(exception, host);
    }
    const client = host.switchToWs().getClient();
    if (!client) {
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
    const filter = this.selectCustomFilter(exception);
    filter && filter.func(exception, args);
    return !!filter;
  }

  private selectCustomFilter<T = any>(
    exception: T,
  ): ExceptionFilterMetadata | undefined {
    if (isEmptyArray(this.filters)) {
      return undefined;
    }
    return selectExceptionFilterMetadata(this.filters, exception);
  }
}
