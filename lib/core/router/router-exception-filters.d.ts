import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { RouterProxyCallback } from './../router/router-proxy';
import { ApplicationConfig } from './../application-config';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context';
import { HttpServer } from '@nestjs/common';
export declare class RouterExceptionFilters extends BaseExceptionFilterContext {
  private readonly config;
  private readonly applicationRef;
  constructor(config: ApplicationConfig, applicationRef: HttpServer);
  create(
    instance: Controller,
    callback: RouterProxyCallback,
  ): ExceptionsHandler;
  getGlobalMetadata<T extends any[]>(): T;
}
