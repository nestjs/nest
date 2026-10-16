import { Observable, of } from 'rxjs';
import { BaseRpcExceptionFilter } from './base-rpc-exception-filter.js';
import { RpcException } from './rpc-exception.js';
import {
  type RpcExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmptyArray,
  isUndefined,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';
import { InvalidExceptionFilterException } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class RpcExceptionsHandler extends BaseRpcExceptionFilter {
  private filters: RpcExceptionFilterMetadata[] = [];

  /**
   * @param reportUnhandled Log an `RpcException` no filter matched. An event
   * handler has no response stream to carry it back, so it would be lost.
   */
  public handle(
    exception: Error | RpcException,
    host: ArgumentsHost,
    reportUnhandled = false,
  ): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception, host);
    // `undefined` stands for "not handled": no filter caught the exception,
    // or the one that did returned nothing. Any other falsy result is still
    // the response, wrapped as RxJS accepts only streams from `catchError()`.
    if (!isUndefined(filterResult$)) {
      return filterResult$ || of(filterResult$);
    }
    if (reportUnhandled && exception instanceof RpcException) {
      BaseRpcExceptionFilter.logger.error(exception);
    }
    return super.catch(exception, host);
  }

  public setCustomFilters(filters: RpcExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(
    exception: T,
    host: ArgumentsHost,
  ): Observable<any> | undefined {
    if (isEmptyArray(this.filters)) {
      return;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : undefined;
  }
}
