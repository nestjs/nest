import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';
export declare class ExceptionFiltersContext extends BaseExceptionFilterContext {
  create(
    instance: Controller,
    callback: (client, data) => any,
  ): WsExceptionsHandler;
  getGlobalMetadata<T extends any[]>(): T;
}
