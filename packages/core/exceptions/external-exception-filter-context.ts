import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { RouterProxyCallback } from '../router/router-proxy.js';
import { BaseExceptionFilterContext } from './base-exception-filter-context.js';
import { ExternalExceptionsHandler } from './external-exceptions-handler.js';
import {
  EXCEPTION_FILTERS_METADATA,
  Controller,
  ExceptionFilterMetadata,
  isEmpty,
} from '@nestjs/common/internal';

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
    const filters = this.createContext<ExceptionFilterMetadata[]>(
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

  public getGlobalMetadata<T extends any[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as any[] as T;
    }
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    const scopedFilterWrappers =
      this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = iterate(scopedFilterWrappers)
      .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter(host => !!host)
      .map(host => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }
}
