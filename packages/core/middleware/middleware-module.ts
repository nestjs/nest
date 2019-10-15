import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  MiddlewareConfiguration,
  RouteInfo,
} from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middleware/nest-middleware.interface';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import {
  addLeadingSlash,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { ContextIdFactory } from '../helpers/context-id-factory';
import { ExecutionContextHost } from '../helpers/execution-context-host';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants';
import { RouterExceptionFilters } from '../router/router-exception-filters';
import { RouterProxy } from '../router/router-proxy';
import { MiddlewareBuilder } from './builder';
import { MiddlewareContainer } from './container';
import { MiddlewareResolver } from './resolver';
import { RoutesMapper } from './routes-mapper';
import { getPathName } from '@nestjs/common/utils/shared.utils';

export class MiddlewareModule {
  private readonly routerProxy = new RouterProxy();
  private readonly exceptionFiltersCache = new WeakMap();

  private injector: Injector;
  private routerExceptionFilter: RouterExceptionFilters;
  private routesMapper: RoutesMapper;
  private resolver: MiddlewareResolver;
  private config: ApplicationConfig;
  private container: NestContainer;
  private httpAdapter: HttpServer;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: NestContainer,
    config: ApplicationConfig,
    injector: Injector,
    httpAdapter: HttpServer,
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
    this.httpAdapter = httpAdapter;

    const modules = container.getModules();
    await this.resolveMiddleware(middlewareContainer, modules);
  }

  public async resolveMiddleware(
    middlewareContainer: MiddlewareContainer,
    modules: Map<string, Module>,
  ) {
    const moduleEntries = [...modules.entries()];
    const loadMiddlewareConfiguration = async ([name, module]: [
      string,
      Module,
    ]) => {
      const instance = module.instance;
      await this.loadConfiguration(middlewareContainer, instance, name);
      await this.resolver.resolveInstances(module, name);
    };
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration));
  }

  public async loadConfiguration(
    middlewareContainer: MiddlewareContainer,
    instance: NestModule,
    moduleKey: string,
  ) {
    if (!instance.configure) {
      return;
    }
    const middlewareBuilder = new MiddlewareBuilder(
      this.routesMapper,
      this.httpAdapter,
    );
    await instance.configure(middlewareBuilder);

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
    const registerAllConfigs = async (
      moduleKey: string,
      middlewareConfig: MiddlewareConfiguration[],
    ) => {
      for (const config of middlewareConfig) {
        await this.registerMiddlewareConfig(
          middlewareContainer,
          config,
          moduleKey,
          applicationRef,
          middlewareConfig,
        );
      }
    };

    const entriesSortedByDistance = [...configs.entries()].sort(
      ([moduleA], [moduleB]) => {
        return (
          this.container.getModuleByKey(moduleA).distance -
          this.container.getModuleByKey(moduleB).distance
        );
      },
    );
    for (const [moduleRef, moduleConfigurations] of entriesSortedByDistance) {
      await registerAllConfigs(moduleRef, [...moduleConfigurations]);
    }
  }

  public async registerMiddlewareConfig(
    middlewareContainer: MiddlewareContainer,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
    middlewareConfig: MiddlewareConfiguration[],
  ) {
    const { forRoutes } = config;
    for (const routeInfo of forRoutes) {
      await this.registerRouteMiddleware(
        middlewareContainer,
        routeInfo as RouteInfo,
        config,
        moduleKey,
        applicationRef,
        middlewareConfig,
      );
    }
  }

  public async registerRouteMiddleware(
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
    middlewareConfig: MiddlewareConfiguration[],
  ) {
    const middlewareCollection = [].concat(config.middleware);
    const moduleRef = this.container.getModuleByKey(moduleKey);

    for (const metatype of middlewareCollection) {
      const collection = middlewareContainer.getMiddlewareCollection(moduleKey);
      const instanceWrapper = collection.get(metatype.name);
      if (isUndefined(instanceWrapper)) {
        throw new RuntimeException();
      }
      if (instanceWrapper.isTransient) {
        return;
      }
      await this.bindHandler(
        instanceWrapper,
        applicationRef,
        routeInfo.method,
        routeInfo.path,
        moduleRef,
        collection,
        middlewareConfig
      );
    }
  }

  private async bindHandler(
    wrapper: InstanceWrapper<NestMiddleware>,
    applicationRef: HttpServer,
    method: RequestMethod,
    path: string,
    moduleRef: Module,
    collection: Map<string, InstanceWrapper>,
    middlewareConfig: MiddlewareConfiguration[],
  ) {
    const { instance, metatype } = wrapper;
    if (isUndefined(instance.use)) {
      throw new InvalidMiddlewareException(metatype.name);
    }
    const router = await applicationRef.createMiddlewareFactory(method);
    const isStatic = wrapper.isDependencyTreeStatic();
    if (isStatic) {
      const proxy = await this.createProxy(instance, null, middlewareConfig);
      return this.registerHandler(
        router,
        path,
        proxy,
        method,
        middlewareConfig,
      );
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
          const contextId = ContextIdFactory.getByRequest(req);
          if (!req[REQUEST_CONTEXT_ID]) {
            Object.defineProperty(req, REQUEST_CONTEXT_ID, {
              value: contextId,
              enumerable: false,
              writable: false,
              configurable: false,
            });
            this.container.registerRequestProvider(req, contextId);
          }
          const contextInstance = await this.injector.loadPerContext(
            instance,
            moduleRef,
            collection,
            contextId,
          );
          const proxy = await this.createProxy<TRequest, TResponse>(
            contextInstance,
            contextId,
            middlewareConfig,
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
      method,
      middlewareConfig,
    );
  }

  private async createProxy<TRequest = unknown, TResponse = unknown>(
    instance: NestMiddleware,
    contextId = STATIC_CONTEXT,
    middlewareConfig: MiddlewareConfiguration[],
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
    method: RequestMethod,
    middlewareConfig: MiddlewareConfiguration[],
  ) {
    const prefix = this.config.getGlobalPrefix();
    const basePath = addLeadingSlash(prefix);
    if (basePath && path === '/*') {
      // strip slash when a wildcard is being used
      // and global prefix has been set
      path = '*';
    }
    const pathname = basePath + path;
    router(pathname, (req, res, next) => {
      const requestUrl = getPathName(req.originalUrl);
      const isEqualMatchMiddleware = requestUrl === pathname;
      const isEqualMatchHandler = middlewareConfig.some(
        (config: MiddlewareConfiguration) =>
          config.forRoutes.some(
            route => (route as RouteInfo).path === requestUrl,
          ),
      );
      if (
        !isEqualMatchHandler ||
        method === RequestMethod.ALL ||
        (isEqualMatchHandler && isEqualMatchMiddleware)
      ) {
        proxy(req, res, next);
      } else {
        next();
      }
    });
  }
}
