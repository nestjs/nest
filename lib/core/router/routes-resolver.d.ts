import { NestContainer, InstanceWrapper } from '../injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Resolver } from './interfaces/resolver.interface';
import { ApplicationConfig } from './../application-config';
import { HttpServer } from '@nestjs/common/interfaces';
export declare class RoutesResolver implements Resolver {
  private readonly container;
  private readonly config;
  private readonly logger;
  private readonly routerProxy;
  private readonly routerExceptionsFilter;
  private readonly routerBuilder;
  constructor(container: NestContainer, config: ApplicationConfig);
  resolve(appInstance: any, basePath: string): void;
  registerRouters(
    routes: Map<string, InstanceWrapper<Controller>>,
    moduleName: string,
    basePath: string,
    appInstance: HttpServer,
  ): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
  mapExternalException(err: any): any;
}
