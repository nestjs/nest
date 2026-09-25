import type { HttpException } from '@nestjs/common';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception.js';
import { BaseExceptionFilter } from './base-exception-filter.js';
import {
  type ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmptyArray,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';

export class ExceptionsHandler extends BaseExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  /**
   * Returns what the matching custom filter returns, so that callers can
   * await an asynchronous filter: its rejection then fails the request the
   * same way a filter that throws synchronously does, instead of becoming an
   * unhandled rejection that leaves the request without a response.
   */
  public next(
    exception: Error | HttpException,
    ctx: ArgumentsHost,
  ): void | Promise<void> {
    const filter = this.selectCustomFilter(exception);
    if (filter) {
      return filter.func(exception, ctx);
    }
    super.catch(exception, ctx);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(
    exception: T,
    ctx: ArgumentsHost,
  ): boolean {
    const filter = this.selectCustomFilter(exception);
    filter && filter.func(exception, ctx);
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
