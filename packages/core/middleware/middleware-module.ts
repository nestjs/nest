import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  MiddlewareConfiguration,
  RouteInfo,
} from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middleware/nest-middleware.interface';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { createContextId } from '../helpers/context-id-factory';
import { ExecutionContextHost } from '../helpers/execution-context-host';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { RouterExceptionFilters } from '../router/router-exception-filters';
import { RouterProxy } from '../router/router-proxy';
import { STATIC_CONTEXT } from './../injector/constants';
import { Injector } from './../injector/injector';
import { MiddlewareBuilder } from './builder';
import { MiddlewareContainer } from './container';
import { MiddlewareResolver } from './resolver';
import { RoutesMapper } from './routes-mapper';

export class MiddlewareModule {
  private readonly routerProxy = new RouterProxy();
  private readonly exceptionFiltersCache = new WeakMap();

  private injector: Injector;
  private routerExceptionFilter: RouterExceptionFilters;
  private routesMapper: RoutesMapper;
  private resolver: MiddlewareResolver;
  private config: ApplicationConfig;
  private container: NestContainer;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: NestContainer,
    config: ApplicationConfig,
    injector: Injector,
  ) {
    const appRef = container.getHttpAdapterRef();
    this.routerExceptionFilter = new RouterExceptionFilters(
      container,
      config,
      appRef,
    );
    this.routesMapper = new RoutesMapper(container);
    this.resolver = new MiddlewareResolver(middlewareContainer);

    this.config = config;
    this.injector = injector;
    this.container = container;

    const modules = container.getModules();
    await this.resolveMiddleware(middlewareContainer, modules);
  }

  public async resolveMiddleware(
    middlewareContainer: MiddlewareContainer,
    modules: Map<string, Module>,
  ) {
    await Promise.all(
      [...modules.entries()].map(async ([name, module]) => {
        const instance = module.instance;

        this.loadConfiguration(middlewareContainer, instance, name);
        await this.resolver.resolveInstances(module, name);
      }),
    );
  }

  public loadConfiguration(
    middlewareContainer: MiddlewareContainer,
    instance: NestModule,
    moduleKey: string,
  ) {
    if (!instance.configure) {
      return;
    }
    const middlewareBuilder = new MiddlewareBuilder(this.routesMapper);
    instance.configure(middlewareBuilder);

    if (!(middlewareBuilder instanceof MiddlewareBuilder)) {
      return;
    }
    const config = middlewareBuilder.build();
    middlewareContainer.insertConfig(config, moduleKey);
  }

  public async registerMiddleware(
    middlewareContainer: MiddlewareContainer,
    applicationRef: any,
  ) {
    const configs = middlewareContainer.getConfigurations();
    const registerAllConfigs = (
      module: string,
      middlewareConfig: MiddlewareConfiguration[],
    ) =>
      middlewareConfig.map(async (config: MiddlewareConfiguration) => {
        await this.registerMiddlewareConfig(
          middlewareContainer,
          config,
          module,
          applicationRef,
        );
      });

    await Promise.all(
      [...configs.entries()].sort(([moduleA, moduleAConfigs], [moduleB, moduleBConfigs]) => {
        return this.container.getModuleByKey(moduleB).distance - this.container.getModuleByKey(moduleA).distance;
      }).map(async ([module, moduleConfigs]) => {
        await Promise.all(registerAllConfigs(module, [...moduleConfigs]));
      }),
    );
  }

  public async registerMiddlewareConfig(
    middlewareContainer: MiddlewareContainer,
    config: MiddlewareConfiguration,
    module: string,
    applicationRef: any,
  ) {
    const { forRoutes } = config;
    await Promise.all(
      forRoutes.map(async (routeInfo: Type<any> | string | RouteInfo) => {
        await this.registerRouteMiddleware(
          middlewareContainer,
          routeInfo as RouteInfo,
          config,
          module,
          applicationRef,
        );
      }),
    );
  }

  public async registerRouteMiddleware(
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
    const middlewareCollection = [].concat(config.middleware);
    const module = this.container.getModuleByKey(moduleKey);

    await Promise.all(
      middlewareCollection.map(async (metatype: Type<NestMiddleware>) => {
        const collection = middlewareContainer.getMiddlewareCollection(
          moduleKey,
        );
        const instanceWrapper = collection.get(metatype.name);
        if (isUndefined(instanceWrapper)) {
          throw new RuntimeException();
        }
        await this.bindHandler(
          instanceWrapper,
          applicationRef,
          routeInfo.method,
          routeInfo.path,
          module,
          collection,
        );
      }),
    );
  }

  private async bindHandler(
    wrapper: InstanceWrapper<NestMiddleware>,
    applicationRef: HttpServer,
    method: RequestMethod,
    path: string,
    module: Module,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { instance, metatype } = wrapper;
    if (isUndefined(instance.use)) {
      throw new InvalidMiddlewareException(metatype.name);
    }
    const router = applicationRef.createMiddlewareFactory(method);
    const isStatic = wrapper.isDependencyTreeStatic();
    if (isStatic) {
      const proxy = await this.createProxy(instance);
      return this.registerHandler(router, path, proxy);
    }
    this.registerHandler(
      router,
      path,
      async <TRequest, TResponse>(
        req: TRequest,
        res: TResponse,
        next: () => void,
      ) => {
        try {
          const contextId = createContextId();
          const contextInstance = await this.injector.loadPerContext(
            instance,
            module,
            collection,
            contextId,
          );
          const proxy = await this.createProxy<TRequest, TResponse>(
            contextInstance,
            contextId,
          );
          return proxy(req, res, next);
        } catch (err) {
          let exceptionsHandler = this.exceptionFiltersCache.get(instance.use);
          if (!exceptionsHandler) {
            exceptionsHandler = this.routerExceptionFilter.create(
              instance,
              instance.use,
              undefined,
            );
            this.exceptionFiltersCache.set(instance.use, exceptionsHandler);
          }
          const host = new ExecutionContextHost([req, res, next]);
          exceptionsHandler.next(err, host);
        }
      },
    );
  }

  private async createProxy<TRequest = any, TResponse = any>(
    instance: NestMiddleware,
    contextId = STATIC_CONTEXT,
  ): Promise<(req: TRequest, res: TResponse, next: () => void) => void> {
    const exceptionsHandler = this.routerExceptionFilter.create(
      instance,
      instance.use,
      undefined,
      contextId,
    );
    const middleware = instance.use.bind(instance);
    return this.routerProxy.createProxy(middleware, exceptionsHandler);
  }

  private registerHandler(
    router: (...args: any[]) => void,
    path: string,
    proxy: <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void,
  ) {
    const prefix = this.config.getGlobalPrefix();
    const basePath = validatePath(prefix);
    if (basePath && path === '/*') {
      // strip slash when a wildcard is being used
      // and global prefix has been set
      path = '*';
    }
    router(basePath + path, proxy);
  }
}
