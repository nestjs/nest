import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouterProxy, RouterProxyCallback } from './router-proxy';
import { ExpressAdapter } from '../adapters/express-adapter';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RouterExplorer } from './interfaces/explorer.inteface';
import { MetadataScanner } from '../metadata-scanner';
import { ApplicationConfig } from './../application-config';
import { NestContainer } from '../injector/container';
export declare class ExpressRouterExplorer implements RouterExplorer {
  private readonly metadataScanner;
  private readonly routerProxy;
  private readonly expressAdapter;
  private readonly exceptionsFilter;
  private readonly config;
  private readonly executionContextCreator;
  private readonly routerMethodFactory;
  private readonly logger;
  constructor(
    metadataScanner?: MetadataScanner,
    routerProxy?: RouterProxy,
    expressAdapter?: ExpressAdapter,
    exceptionsFilter?: ExceptionsFilter,
    config?: ApplicationConfig,
    container?: NestContainer,
  );
  explore(
    instance: Controller,
    metatype: Metatype<Controller>,
    module: string,
  ): any;
  fetchRouterPath(metatype: Metatype<Controller>): string;
  validateRoutePath(path: string): string;
  scanForPaths(instance: Controller, prototype?: any): RoutePathProperties[];
  exploreMethodMetadata(
    instance: Controller,
    instancePrototype: any,
    methodName: string,
  ): RoutePathProperties;
  applyPathsToRouterProxy(
    router: any,
    routePaths: RoutePathProperties[],
    instance: Controller,
    module: string,
  ): void;
  private applyCallbackToRouter(router, pathProperties, instance, module);
  private createCallbackProxy(
    instance,
    callback,
    methodName,
    module,
    requestMethod,
  );
}
export interface RoutePathProperties {
  path: string;
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
}
