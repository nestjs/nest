import 'reflect-metadata';

import {
  EXCEPTION_FILTERS_METADATA,
  FILTER_CATCH_EXCEPTIONS
} from '@nestjs/common/constants';
import {Metatype} from '@nestjs/common/interfaces';
import {
  Controller
} from '@nestjs/common/interfaces/controllers/controller.interface';
import {RpcExceptionFilter} from '@nestjs/common/interfaces/exceptions';
import {
  isEmpty,
  isFunction,
  isUndefined
} from '@nestjs/common/utils/shared.utils';
import {ApplicationConfig} from '@nestjs/core/application-config';
import {
  BaseExceptionFilterContext
} from '@nestjs/core/exceptions/base-exception-filter-context';
import iterate from 'iterare';
import {Observable} from 'rxjs/Observable';

import {RpcExceptionsHandler} from '../exceptions/rpc-exceptions-handler';

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  constructor(private readonly config: ApplicationConfig) { super(); }

  public create(instance: Controller,
                callback: (data) => Observable<any>): RpcExceptionsHandler {
    const exceptionHandler = new RpcExceptionsHandler();
    const filters =
        this.createContext(instance, callback, EXCEPTION_FILTERS_METADATA);
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters);
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(): T {
    return this.config.getGlobalFilters() as T;
  }
}