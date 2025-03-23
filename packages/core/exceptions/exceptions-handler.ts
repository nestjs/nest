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

  public next(exception: Error | HttpException, ctx: ArgumentsHost) {
    if (this.invokeCustomFilters(exception, ctx)) {
      return;
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
    if (isEmptyArray(this.filters)) {
      return false;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    filter && filter.func(exception, ctx);
    return !!filter;
  }
}
