import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouterProxy, RouterProxyCallback } from './router-proxy';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { routeMappedMessage } from '../helpers/messages';
import { RouterExecutionContext } from './router-execution-context';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RouteParamsFactory } from './route-params-factory';
import { MetadataScanner } from '../metadata-scanner';
import { ApplicationConfig } from './../application-config';
import { PipesContextCreator } from './../pipes/pipes-context-creator';
import { PipesConsumer } from './../pipes/pipes-consumer';
import { NestContainer } from '../injector/container';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { GuardsConsumer } from '../guards/guards-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';

export class RouterExplorer {
  private readonly executionContextCreator: RouterExecutionContext;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, true);

  constructor(
    private readonly metadataScanner: MetadataScanner,
    container: NestContainer,
    private readonly routerProxy?: RouterProxy,
    private readonly exceptionsFilter?: ExceptionsFilter,
    private readonly config?: ApplicationConfig,
  ) {
    this.executionContextCreator = new RouterExecutionContext(
      new RouteParamsFactory(),
      new PipesContextCreator(config),
      new PipesConsumer(),
      new GuardsContextCreator(container, config),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container, config),
      new InterceptorsConsumer(),
      container.getApplicationRef(),
    );
  }

  public explore(
    instance: Controller,
    metatype: Type<Controller>,
    module: string,
    appInstance,
    basePath: string,
  ) {
    const routerPaths = this.scanForPaths(instance);
    this.applyPathsToRouterProxy(
      appInstance,
      routerPaths,
      instance,
      module,
      basePath,
    );
  }

  public extractRouterPath(
    metatype: Type<Controller>,
    prefix?: string,
  ): string {
    let path = Reflect.getMetadata(PATH_METADATA, metatype);
    if (prefix) path = prefix + this.validateRoutePath(path);
    return this.validateRoutePath(path);
  }

  public validateRoutePath(path: string): string {
    if (isUndefined(path)) {
      throw new UnknownRequestMappingException();
    }
    return validatePath(path);
  }

  public scanForPaths(instance: Controller, prototype?): RoutePathProperties[] {
    const instancePrototype = isUndefined(prototype)
      ? Object.getPrototypeOf(instance)
      : prototype;
    return this.metadataScanner.scanFromPrototype<
      Controller,
      RoutePathProperties
    >(instance, instancePrototype, method =>
      this.exploreMethodMetadata(instance, instancePrototype, method),
    );
  }

  public exploreMethodMetadata(
    instance: Controller,
    instancePrototype,
    methodName: string,
  ): RoutePathProperties {
    const targetCallback = instancePrototype[methodName];
    const routePath = Reflect.getMetadata(PATH_METADATA, targetCallback);
    if (isUndefined(routePath)) {
      return null;
    }
    const requestMethod: RequestMethod = Reflect.getMetadata(
      METHOD_METADATA,
      targetCallback,
    );
    return {
      path: this.validateRoutePath(routePath),
      requestMethod,
      targetCallback,
      methodName,
    };
  }

  public applyPathsToRouterProxy(
    router,
    routePaths: RoutePathProperties[],
    instance: Controller,
    module: string,
    basePath: string,
  ) {
    (routePaths || []).map(pathProperties => {
      const { path, requestMethod } = pathProperties;
      this.applyCallbackToRouter(
        router,
        pathProperties,
        instance,
        module,
        basePath,
      );
      this.logger.log(routeMappedMessage(path, requestMethod));
    });
  }

  private applyCallbackToRouter(
    router,
    pathProperties: RoutePathProperties,
    instance: Controller,
    module: string,
    basePath: string,
  ) {
    const { path, requestMethod, targetCallback, methodName } = pathProperties;
    const routerMethod = this.routerMethodFactory
      .get(router, requestMethod)
      .bind(router);

    const proxy = this.createCallbackProxy(
      instance,
      targetCallback,
      methodName,
      module,
      requestMethod,
    );
    const stripSlash = str =>
      str[str.length - 1] === '/' ? str.slice(0, str.length - 1) : str;
    const fullPath = stripSlash(basePath) + path;
    routerMethod(stripSlash(fullPath) || '/', proxy);
  }

  private createCallbackProxy(
    instance: Controller,
    callback: RouterProxyCallback,
    methodName: string,
    module: string,
    requestMethod,
  ) {
    const executionContext = this.executionContextCreator.create(
      instance,
      callback,
      methodName,
      module,
      requestMethod,
    );
    const exceptionFilter = this.exceptionsFilter.create(instance, callback);
    return this.routerProxy.createProxy(executionContext, exceptionFilter);
  }
}

export interface RoutePathProperties {
  path: string;
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
}
