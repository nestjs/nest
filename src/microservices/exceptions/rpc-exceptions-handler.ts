import 'rxjs/add/observable/throw';

import {Logger} from '@nestjs/common';
import {RpcExceptionFilterMetadata} from '@nestjs/common/interfaces/exceptions';
import {isEmpty, isObject} from '@nestjs/common/utils/shared.utils';
import {messages} from '@nestjs/core/constants';
import {
  InvalidExceptionFilterException
} from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import {Observable} from 'rxjs/Observable';

import {RpcException} from './rpc-exception';

export class RpcExceptionsHandler {
  private filters: RpcExceptionFilterMetadata[] = [];

  public handle(exception: Error|RpcException|any): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception);
    if (filterResult$) {
      return filterResult$;
    }
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      const message = messages.UNKNOWN_EXCEPTION_MESSAGE;
      return Observable.throw({status, message});
    }
    const res = exception.getError();
    const message = isObject(res) ? res : ({status, message : res});
    return Observable.throw(message);
  }

  public setCustomFilters(filters: RpcExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(exception): Observable<any>|null {
    if (isEmpty(this.filters))
      return null;

    const filter = this.filters.find(({exceptionMetatypes, func}) => {
      const hasMetatype = !!exceptionMetatypes.find(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
      );
      return hasMetatype;
    });
    return filter ? filter.func(exception) : null;
  }
}
