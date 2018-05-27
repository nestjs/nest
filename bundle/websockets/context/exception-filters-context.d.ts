import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { NestContainer } from '@nestjs/core/injector/container';
import 'reflect-metadata';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
    constructor(container: NestContainer);
    create(instance: Controller, callback: (client, data) => any, module: string): WsExceptionsHandler;
    getGlobalMetadata<T extends any[]>(): T;
}
