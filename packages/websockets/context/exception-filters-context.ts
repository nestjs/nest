import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler.js';
import { EXCEPTION_FILTERS_METADATA, isEmpty } from '@nestjs/common/internal';
import { BaseExceptionFilterContext } from '@nestjs/core/internal';
import type { NestContainer } from '@nestjs/core';

/**
 * @publicApi
 */
export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  constructor(container: NestContainer) {
    super(container);
  }

  public create(
    instance: object,
    callback: <TClient>(client: TClient, data: any) => any,
    moduleKey: string,
  ): WsExceptionsHandler {
    this.moduleContext = moduleKey;

    const exceptionHandler = new WsExceptionsHandler();
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(): T {
    return [] as any[] as T;
  }
}
