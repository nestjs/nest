import { ApplicationConfig } from '@nestjs/core/application-config';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { EXCEPTION_FILTERS_METADATA, FILTER_CATCH_EXCEPTIONS } from '/constants';
import { Metatype } from '/interfaces';
import { Controller } from '/interfaces/controllers/controller.interface';
import { RpcExceptionFilter } from '/interfaces/exceptions';
import { isEmpty, isFunction, isUndefined } from '/utils/shared.utils';
import iterate from 'iterare';
import 'reflect-metadata';
import { Observable } from 'rxjs/Observable';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
    constructor(private readonly config: ApplicationConfig) {
        super();
    }

    public create(instance: Controller, callback: (data) => Observable<any>): RpcExceptionsHandler {
        const exceptionHandler = new RpcExceptionsHandler();
        const filters = this.createContext(instance, callback, EXCEPTION_FILTERS_METADATA);
        if (isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters);
        return exceptionHandler;
    }

    public getGlobalMetadata<T extends any[]>(): T {
        return this.config.getGlobalFilters() as T;
    }
}
