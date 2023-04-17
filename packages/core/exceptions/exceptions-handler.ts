import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { HttpException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { selectExceptionFilterMetadata } from '@nestjs/common/utils/select-exception-filter-metadata.util';
import { BaseExceptionFilter } from './base-exception-filter';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception';

export class ExceptionsHandler extends BaseExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | HttpException | any, ctx: ArgumentsHost) {
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
    if (isEmpty(this.filters)) {
      return false;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    filter && filter.func(exception, ctx);
    return !!filter;
  }
}
