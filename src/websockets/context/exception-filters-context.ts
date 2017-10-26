import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { EXCEPTION_FILTERS_METADATA, FILTER_CATCH_EXCEPTIONS } from '/constants';
import { Metatype } from '/interfaces';
import { Controller } from '/interfaces/controllers/controller.interface';
import { RpcExceptionFilter } from '/interfaces/exceptions';
import { isEmpty, isFunction, isUndefined } from '/utils/shared.utils';
import iterate from 'iterare';
import 'reflect-metadata';
import { Observable } from 'rxjs/Observable';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
    public create(instance: Controller, callback: (client, data) => any): WsExceptionsHandler {
        const exceptionHandler = new WsExceptionsHandler();
        const filters = this.createContext(instance, callback, EXCEPTION_FILTERS_METADATA);
        if (isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters);
        return exceptionHandler;
    }

    public getGlobalMetadata<T extends any[]>(): T {
        return [] as T;
    }
}
