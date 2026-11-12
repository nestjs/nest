import type { ArgumentsHost } from '@nestjs/common';
import { WsException } from '../errors/ws-exception.js';
import { BaseWsExceptionFilter } from './base-ws-exception-filter.js';
import {
  type ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmptyArray,
  isFunction,
} from '@nestjs/common/internal';
import { InvalidExceptionFilterException } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class WsExceptionsHandler extends BaseWsExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];
  // The promises of asynchronous filters, for handle() to return
  private readonly pendingFilterResults = new WeakMap<
    ArgumentsHost,
    PromiseLike<unknown>
  >();

  /**
   * Returns the promise of an asynchronous exception filter. The exception is
   * being handled until it settles, so callers wait for it: the adapters
   * count the message as being handled until then.
   */
  public handle(
    exception: Error | WsException,
    host: ArgumentsHost,
  ): void | PromiseLike<unknown> {
    const client = host.switchToWs().getClient();
    if (this.invokeCustomFilters(exception, host)) {
      const pending = this.pendingFilterResults.get(host);
      this.pendingFilterResults.delete(host);
      return pending;
    }
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
    if (isEmptyArray(this.filters)) return false;

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    if (!filter) {
      return false;
    }
    const result = filter.func(exception, args);
    if (isFunction(result?.then)) {
      this.pendingFilterResults.set(args, result);
    }
    return true;
  }
}
