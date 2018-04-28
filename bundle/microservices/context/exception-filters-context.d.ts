import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
    private readonly config;
    constructor(container: NestContainer, config: ApplicationConfig);
    create(instance: Controller, callback: (data) => Observable<any>, module: string): RpcExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
