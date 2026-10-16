import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';
import type { ApplicationConfig, NestContainer } from '@nestjs/core';
import {
  BaseExceptionFilterContext,
  STATIC_CONTEXT,
} from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: <T = any>(data: T) => Observable<any>,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): RpcExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new RpcExceptionsHandler();
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

  public getGlobalMetadata<T extends any[]>(
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
