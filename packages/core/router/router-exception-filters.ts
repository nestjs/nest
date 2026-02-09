import { HttpServer } from '@nestjs/common';
import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants.js';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface.js';
import { isEmpty } from '@nestjs/common/utils/shared.utils.js';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context.js';
import { ExceptionsHandler } from '../exceptions/exceptions-handler.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { RouterProxyCallback } from './router-proxy.js';

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
    if (isEmpty(filters)) {
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
