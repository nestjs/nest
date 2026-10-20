import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception.js';
import { ExternalExceptionFilter } from './external-exception-filter.js';
import {
  type ExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmptyArray,
  isUndefined,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';

export class ExternalExceptionsHandler extends ExternalExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error, host: ArgumentsHost): Promise<any> {
    const result = this.invokeCustomFilters(exception, host);
    // `undefined` stands for "not handled": no filter caught the exception,
    // or the one that did returned nothing
    if (!isUndefined(result)) {
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
  ): Promise<any> | undefined {
    if (isEmptyArray(this.filters)) {
      return;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : undefined;
  }
}
