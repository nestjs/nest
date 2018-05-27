import { HttpServer } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import 'reflect-metadata';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { NestContainer } from '../injector/container';
import { ApplicationConfig } from './../application-config';
import { RouterProxyCallback } from './../router/router-proxy';
export declare class RouterExceptionFilters extends BaseExceptionFilterContext {
    private readonly config;
    private readonly applicationRef;
    constructor(container: NestContainer, config: ApplicationConfig, applicationRef: HttpServer);
    create(instance: Controller, callback: RouterProxyCallback, module: string): ExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
