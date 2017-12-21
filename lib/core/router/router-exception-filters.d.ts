import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { RouterProxyCallback } from './../router/router-proxy';
import { ApplicationConfig } from './../application-config';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context';
export declare class RouterExceptionFilters extends BaseExceptionFilterContext {
  private readonly config;
  constructor(config: ApplicationConfig);
  create(
    instance: Controller,
    callback: RouterProxyCallback
  ): ExceptionsHandler;
  getGlobalMetadata<T extends any[]>(): T;
}
