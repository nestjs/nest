import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { NestContainer } from '@nestjs/core/injector/container';
import 'reflect-metadata';
import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
    private readonly config;
    constructor(container: NestContainer, config: ApplicationConfig);
    create(instance: Controller, callback: (data) => Observable<any>, module: string): RpcExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
