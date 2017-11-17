import 'reflect-metadata';

import {
  EXCEPTION_FILTERS_METADATA,
  FILTER_CATCH_EXCEPTIONS
} from '@nestjs/common/constants';
import {
  Controller
} from '@nestjs/common/interfaces/controllers/controller.interface';
import {
  ExceptionFilterMetadata
} from
    '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import {
  ExceptionFilter
} from '@nestjs/common/interfaces/exceptions/exception-filter.interface';
import {Metatype} from '@nestjs/common/interfaces/index';
import {
  isEmpty,
  isFunction,
  isUndefined
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';

import {
  UnknownModuleException
} from '../errors/exceptions/unknown-module.exception';
import {
  BaseExceptionFilterContext
} from '../exceptions/base-exception-filter-context';
import {ExceptionsHandler} from '../exceptions/exceptions-handler';

import {ApplicationConfig} from './../application-config';
import {RouterProxyCallback} from './../router/router-proxy';

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  constructor(private readonly config: ApplicationConfig) { super(); }

  public create(instance: Controller,
                callback: RouterProxyCallback): ExceptionsHandler {
    const exceptionHandler = new ExceptionsHandler();
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