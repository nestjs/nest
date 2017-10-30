import { EXCEPTION_FILTERS_METADATA, FILTER_CATCH_EXCEPTIONS } from '@nestjs/core/constants';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { Metatype } from '@nestjs/core/interfaces';
import { Controller } from '@nestjs/core/interfaces/controllers/controller.interface';
import { RpcExceptionFilter } from '@nestjs/core/interfaces/exceptions';
import { isEmpty, isFunction, isUndefined } from '@nestjs/core/utils/shared.utils';
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
