import { ApplicationConfig } from '@nestjs/core/application-config';
import { EXCEPTION_FILTERS_METADATA, FILTER_CATCH_EXCEPTIONS } from '@nestjs/core/constants';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { Metatype } from '@nestjs/core/interfaces';
import { Controller } from '@nestjs/core/interfaces/controllers/controller.interface';
import { RpcExceptionFilter } from '@nestjs/core/interfaces/exceptions';
import { isEmpty, isFunction, isUndefined } from '@nestjs/core/utils/shared.utils';
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
