import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { STATIC_CONTEXT } from '../injector/constants';
import { RouterProxyCallback } from '../router/router-proxy';
import { ApplicationConfig } from './../application-config';
import { NestContainer } from './../injector/container';
import { BaseExceptionFilterContext } from './base-exception-filter-context';
import { ExternalExceptionsHandler } from './external-exceptions-handler';

export class ExternalExceptionFilterContext extends BaseExceptionFilterContext {
  constructor(
    container: NestContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: RouterProxyCallback,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExternalExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new ExternalExceptionsHandler();
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId,
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(): T {
    if (!this.config) {
      return [] as T;
    }
    return this.config.getGlobalFilters() as T;
  }
}
