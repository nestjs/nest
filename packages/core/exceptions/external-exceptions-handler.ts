import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception.js';
import { ExternalExceptionFilter } from './external-exception-filter.js';
import {
  ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmpty,
} from '@nestjs/common/internal';
import { ArgumentsHost } from '@nestjs/common';

export class ExternalExceptionsHandler extends ExternalExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error, host: ArgumentsHost): Promise<any> {
    const result = this.invokeCustomFilters(exception, host);
    if (result) {
      return result;
    }
    return super.catch(exception, host);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(
    exception: T,
    host: ArgumentsHost,
  ): Promise<any> | null {
    if (isEmpty(this.filters)) {
      return null;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : null;
  }
}
