import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { NestContainer } from '@nestjs/core/injector/container';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

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
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): WsExceptionsHandler {
    this.moduleContext = moduleKey;

    const exceptionHandler = new WsExceptionsHandler();
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
    return [] as any[] as T;
  }
}
