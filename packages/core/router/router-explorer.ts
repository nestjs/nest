import { HttpServer } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { ROUTE_MAPPED_MESSAGE } from '../helpers/messages';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { MetadataScanner } from '../metadata-scanner';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RouteParamsFactory } from './route-params-factory';
import { RouterExecutionContext } from './router-execution-context';
import { RouterProxy, RouterProxyCallback } from './router-proxy';

export interface RoutePathProperties {
  path: string;
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
}

export class RouterExplorer {
  private readonly executionContextCreator: RouterExecutionContext;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, true);

  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly container: NestContainer,
    private readonly injector?: Injector,
    private readonly routerProxy?: RouterProxy,
    private readonly exceptionsFilter?: ExceptionsFilter,
    config?: ApplicationConfig,
  ) {
    this.executionContextCreator = new RouterExecutionContext(
      new RouteParamsFactory(),
      new PipesContextCreator(container, config),
      new PipesConsumer(),
      new GuardsContextCreator(container, config),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container, config),
      new InterceptorsConsumer(),
      container.getApplicationRef(),
    );
  }

  public explore<T extends HttpServer = any>(
    instanceWrapper: InstanceWrapper,
    module: string,
    applicationRef: T,
    basePath: string,
  ) {
    const { instance } = instanceWrapper;
    const routerPaths = this.scanForPaths(instance);
    this.applyPathsToRouterProxy(
      applicationRef,
      routerPaths,
      instanceWrapper,
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

  public scanForPaths(
    instance: Controller,
    prototype?: any,
  ): RoutePathProperties[] {
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
    instancePrototype: any,
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

  public applyPathsToRouterProxy<T extends HttpServer>(
    router: T,
    routePaths: RoutePathProperties[],
    instanceWrapper: InstanceWrapper,
    module: string,
    basePath: string,
  ) {
    (routePaths || []).forEach(pathProperties => {
      const { path, requestMethod } = pathProperties;
      this.applyCallbackToRouter(
        router,
        pathProperties,
        instanceWrapper,
        module,
        basePath,
      );
      this.logger.log(ROUTE_MAPPED_MESSAGE(path, requestMethod));
    });
  }

  private applyCallbackToRouter<T extends HttpServer>(
    router: T,
    pathProperties: RoutePathProperties,
    instanceWrapper: InstanceWrapper,
    module: string,
    basePath: string,
  ) {
    const { path, requestMethod, targetCallback, methodName } = pathProperties;
    const routerMethod = this.routerMethodFactory
      .get(router, requestMethod)
      .bind(router);

    const stripSlash = (str: string) =>
      str[str.length - 1] === '/' ? str.slice(0, str.length - 1) : str;
    const fullPath = stripSlash(basePath) + path;

    const { instance } = instanceWrapper;
    const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();

    if (isRequestScoped) {
      routerMethod(
        stripSlash(fullPath) || '/',
        async <TRequest, TResponse>(
          req: TRequest,
          res: TResponse,
          next: Function,
        ) => {
          const contextId = { id: 1 }; // asyncId
          const contextInstance = await this.injector.loadControllerPerContext(
            instance,
            this.container.getModules(),
            module,
            contextId,
          );
          this.createCallbackProxy(
            contextInstance,
            contextInstance[methodName],
            methodName,
            module,
            requestMethod,
            contextId,
          )(req, res, next);
        },
      );
      return;
    }
    const proxy = this.createCallbackProxy(
      instance,
      targetCallback,
      methodName,
      module,
      requestMethod,
    );
    routerMethod(stripSlash(fullPath) || '/', proxy);
  }

  private createCallbackProxy(
    instance: Controller,
    callback: RouterProxyCallback,
    methodName: string,
    module: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
  ) {
    const executionContext = this.executionContextCreator.create(
      instance,
      callback,
      methodName,
      module,
      requestMethod,
      contextId,
    );
    const exceptionFilter = this.exceptionsFilter.create(
      instance,
      callback,
      module,
      contextId,
    );
    return this.routerProxy.createProxy(executionContext, exceptionFilter);
  }
}
