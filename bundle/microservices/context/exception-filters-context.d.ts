import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Observable } from 'rxjs/Observable';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { ApplicationConfig } from '@nestjs/core/application-config';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
    private readonly config;
    constructor(config: ApplicationConfig);
    create(instance: Controller, callback: (data) => Observable<any>): RpcExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
