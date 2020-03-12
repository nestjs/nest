import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { NestContainer } from '@nestjs/core/injector/container';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

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
    return [] as T;
  }
}
