import { HttpServer } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  isString,
  isUndefined,
  validatePath,
} from '@nestjs/common/utils/shared.utils';
import * as pathToRegexp from 'path-to-regexp';
import { ApplicationConfig } from '../application-config';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { ContextIdFactory } from '../helpers';
import { ExecutionContextHost } from '../helpers/execution-context-host';
import { ROUTE_MAPPED_MESSAGE } from '../helpers/messages';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { MetadataScanner } from '../metadata-scanner';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { REQUEST_CONTEXT_ID } from './request/request-constants';
import { RouteParamsFactory } from './route-params-factory';
import { RouterExecutionContext } from './router-execution-context';
import { RouterProxy, RouterProxyCallback } from './router-proxy';

export interface RoutePathProperties {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
}

export class RouterExplorer {
  private readonly executionContextCreator: RouterExecutionContext;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, true);
  private readonly exceptionFiltersCache = new WeakMap();

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
      container.getHttpAdapterRef(),
    );
  }

  public explore<T extends HttpServer = any>(
    instanceWrapper: InstanceWrapper,
    module: string,
    applicationRef: T,
    basePath: string,
    host: string,
  ) {
    const { instance } = instanceWrapper;
    const routerPaths = this.scanForPaths(instance);
    this.applyPathsToRouterProxy(
      applicationRef,
      routerPaths,
      instanceWrapper,
      module,
      basePath,
      host,
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
    const path = isString(routePath)
      ? [this.validateRoutePath(routePath)]
      : routePath.map(p => this.validateRoutePath(p));
    return {
      path,
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
    host: string,
  ) {
    (routePaths || []).forEach(pathProperties => {
      const { path, requestMethod } = pathProperties;
      this.applyCallbackToRouter(
        router,
        pathProperties,
        instanceWrapper,
        module,
        basePath,
        host,
      );
      path.forEach(p =>
        this.logger.log(ROUTE_MAPPED_MESSAGE(p, requestMethod)),
      );
    });
  }

  private applyCallbackToRouter<T extends HttpServer>(
    router: T,
    pathProperties: RoutePathProperties,
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    basePath: string,
    host: string,
  ) {
    const {
      path: paths,
      requestMethod,
      targetCallback,
      methodName,
    } = pathProperties;
    const { instance } = instanceWrapper;
    const routerMethod = this.routerMethodFactory
      .get(router, requestMethod)
      .bind(router);

    const stripSlash = (str: string) =>
      str[str.length - 1] === '/' ? str.slice(0, str.length - 1) : str;

    const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();
    const proxy = isRequestScoped
      ? this.createRequestScopedHandler(
          instanceWrapper,
          requestMethod,
          this.container.getModuleByKey(moduleKey),
          moduleKey,
          methodName,
        )
      : this.createCallbackProxy(
          instance,
          targetCallback,
          methodName,
          moduleKey,
          requestMethod,
        );

    const hostHandler = this.applyHostFilter(host, proxy);
    paths.forEach(path => {
      const fullPath = stripSlash(basePath) + path;
      routerMethod(stripSlash(fullPath) || '/', hostHandler);
    });
  }

  private applyHostFilter(host: string, handler: Function) {
    if (!host) {
      return handler;
    }

    const httpAdapterRef = this.container.getHttpAdapterRef();
    const keys = [];
    const re = pathToRegexp(host, keys);

    return <TRequest extends Record<string, any> = any, TResponse = any>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      (req as Record<string, any>).hosts = {};
      const hostname = httpAdapterRef.getRequestHostname(req) || '';
      const match = hostname.match(re);
      if (match) {
        keys.forEach((key, i) => (req.hosts[key.name] = match[i + 1]));
        return handler(req, res, next);
      }
      if (!next) {
        throw new InternalServerErrorException(
          `HTTP adapter does not support filtering on host: "${host}"`,
        );
      }
      return next();
    };
  }

  private createCallbackProxy(
    instance: Controller,
    callback: RouterProxyCallback,
    methodName: string,
    module: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const executionContext = this.executionContextCreator.create(
      instance,
      callback,
      methodName,
      module,
      requestMethod,
      contextId,
      inquirerId,
    );
    const exceptionFilter = this.exceptionsFilter.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    return this.routerProxy.createProxy(executionContext, exceptionFilter);
  }

  public createRequestScopedHandler(
    instanceWrapper: InstanceWrapper,
    requestMethod: RequestMethod,
    module: Module,
    moduleKey: string,
    methodName: string,
  ) {
    const { instance } = instanceWrapper;
    const collection = module.controllers;
    return async <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        const contextId = this.getContextId(req);
        const contextInstance = await this.injector.loadPerContext(
          instance,
          module,
          collection,
          contextId,
        );
        await this.createCallbackProxy(
          contextInstance,
          contextInstance[methodName],
          methodName,
          moduleKey,
          requestMethod,
          contextId,
          instanceWrapper.id,
        )(req, res, next);
      } catch (err) {
        let exceptionFilter = this.exceptionFiltersCache.get(
          instance[methodName],
        );
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionsFilter.create(
            instance,
            instance[methodName],
            moduleKey,
          );
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost([req, res, next]);
        exceptionFilter.next(err, host);
      }
    };
  }

  private getContextId<T extends Record<any, any> = any>(
    request: T,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      this.container.registerRequestProvider(request, contextId);
    }
    return contextId;
  }
}
