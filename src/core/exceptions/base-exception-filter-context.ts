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
import {ExceptionsHandler} from '../exceptions/exceptions-handler';

import {ApplicationConfig} from './../application-config';
import {ContextCreator} from './../helpers/context-creator';
import {RouterProxyCallback} from './../router/router-proxy';

export class BaseExceptionFilterContext extends ContextCreator {
  public createConcreteContext<T extends any[], R extends any[]>(metadata: T):
      R {
    if (isUndefined(metadata) || isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
               .filter((instance) =>
                           instance.catch && isFunction(instance.catch))
               .map(
                   (instance) => ({
                     func : instance.catch.bind(instance),
                     exceptionMetatypes : this.reflectCatchExceptions(instance),
                   }))
               .toArray() as R;
  }

  public reflectCatchExceptions(instance: ExceptionFilter): Metatype<any>[] {
    const prototype = Object.getPrototypeOf(instance);
    return Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS,
                               prototype.constructor) ||
           [];
  }
}