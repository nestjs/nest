import { Observable } from 'rxjs';
import { BaseRpcExceptionFilter } from './base-rpc-exception-filter.js';
import { RpcException } from './rpc-exception.js';
import {
  type RpcExceptionFilterMetadata,
  selectExceptionFilterMetadata,
  isEmpty,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';
import { InvalidExceptionFilterException } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class RpcExceptionsHandler extends BaseRpcExceptionFilter {
  private filters: RpcExceptionFilterMetadata[] = [];

  public handle(
    exception: Error | RpcException,
    host: ArgumentsHost,
  ): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception, host);
    if (filterResult$) {
      return filterResult$;
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
  ): Observable<any> | null {
    if (isEmpty(this.filters)) {
      return null;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : null;
  }
}
