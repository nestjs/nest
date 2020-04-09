import { Type } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception';
import { ExternalExceptionFilter } from './external-exception-filter';

export class ExternalExceptionsHandler extends ExternalExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | any, host: ArgumentsHost): Promise<any> {
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
    const isInstanceOf = (metatype: Type<unknown>) =>
      exception instanceof metatype;

    const filter = this.filters.find(({ exceptionMetatypes }) => {
      const typeExists =
        !exceptionMetatypes.length || exceptionMetatypes.some(isInstanceOf);
      return typeExists;
    });
    return filter ? filter.func(exception, host) : null;
  }
}
