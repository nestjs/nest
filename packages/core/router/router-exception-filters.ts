import type { HttpServer } from '@nestjs/common';
import { ApplicationConfig } from '../application-config.js';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context.js';
import { ExceptionsHandler } from '../exceptions/exceptions-handler.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { RouterProxyCallback } from './router-proxy.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
    private readonly applicationRef: HttpServer,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: RouterProxyCallback,
    moduleKey: string | undefined,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionsHandler {
    this.moduleContext = moduleKey!;

    const exceptionHandler = new ExceptionsHandler(this.applicationRef);
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId,
    );
    if (isEmptyArray(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    return this.resolveGlobalEnhancers(
      this.config.getGlobalFiltersInBindingOrder(),
      contextId,
      inquirerId,
    ) as T;
  }
}
