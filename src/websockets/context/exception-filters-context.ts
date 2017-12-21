import 'reflect-metadata';
import iterate from 'iterare';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Observable } from 'rxjs/Observable';
import {
  EXCEPTION_FILTERS_METADATA,
  FILTER_CATCH_EXCEPTIONS
} from '@nestjs/common/constants';
import {
  isEmpty,
  isUndefined,
  isFunction
} from '@nestjs/common/utils/shared.utils';
import { RpcExceptionFilter } from '@nestjs/common/interfaces/exceptions';
import { Metatype } from '@nestjs/common/interfaces';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  public create(
    instance: Controller,
    callback: (client, data) => any
  ): WsExceptionsHandler {
    const exceptionHandler = new WsExceptionsHandler();
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters);
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(): T {
    return [] as T;
  }
}
