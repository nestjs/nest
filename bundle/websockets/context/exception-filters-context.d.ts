import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';
import { NestContainer } from '@nestjs/core/injector/container';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
    constructor(container: NestContainer);
    create(instance: Controller, callback: (client, data) => any, module: string): WsExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
