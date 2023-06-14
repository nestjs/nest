import { HttpServer, InjectionToken, Logger } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  MiddlewareConfiguration,
  NestMiddleware,
  RouteInfo,
} from '@nestjs/common/interfaces/middleware';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { ContextIdFactory } from '../helpers/context-id-factory';
import { ExecutionContextHost } from '../helpers/execution-context-host';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { GraphInspector } from '../inspector/graph-inspector';
import {
  Entrypoint,
  MiddlewareEntrypointMetadata,
} from '../inspector/interfaces/entrypoint.interface';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants';
import { RouterExceptionFilters } from '../router/router-exception-filters';
import { RouterProxy } from '../router/router-proxy';
import { isRequestMethodAll } from '../router/utils';
import { MiddlewareBuilder } from './builder';
import { MiddlewareContainer } from './container';
import { MiddlewareResolver } from './resolver';
import { RouteInfoPathExtractor } from './route-info-path-extractor';
import { RoutesMapper } from './routes-mapper';

export class MiddlewareModule<
  TAppOptions extends NestApplicationContextOptions = NestApplicationContextOptions,
> {
  private readonly routerProxy = new RouterProxy();
  private readonly exceptionFiltersCache = new WeakMap();
  private readonly logger = new Logger(MiddlewareModule.name);

  private injector: Injector;
  private routerExceptionFilter: RouterExceptionFilters;
  private routesMapper: RoutesMapper;
  private resolver: MiddlewareResolver;
  private container: NestContainer;
  private httpAdapter: HttpServer;
  private graphInspector: GraphInspector;
  private appOptions: TAppOptions;
  private routeInfoPathExtractor: RouteInfoPathExtractor;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: NestContainer,
    config: ApplicationConfig,
    injector: Injector,
    httpAdapter: HttpServer,
    graphInspector: GraphInspector,
    options: TAppOptions,
  ) {
    this.appOptions = options;

    const appRef = container.getHttpAdapterRef();
    this.routerExceptionFilter = new RouterExceptionFilters(
      container,
      config,
      appRef,
    );
    this.routesMapper = new RoutesMapper(container, config);
    this.resolver = new MiddlewareResolver(middlewareContainer, injector);
    this.routeInfoPathExtractor = new RouteInfoPathExtractor(config);
    this.injector = injector;
    this.container = container;
    this.httpAdapter = httpAdapter;
    this.graphInspector = graphInspector;

    const modules = container.getModules();
    await this.resolveMiddleware(middlewareContainer, modules);
  }

  public async resolveMiddleware(
    middlewareContainer: MiddlewareContainer,
    modules: Map<string, Module>,
  ) {
    const moduleEntries = [...modules.entries()];
    const loadMiddlewareConfiguration = async ([moduleName, moduleRef]: [
      string,
      Module,
    ]) => {
      await this.loadConfiguration(middlewareContainer, moduleRef, moduleName);
      await this.resolver.resolveInstances(moduleRef, moduleName);
    };
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration));
  }

  public async loadConfiguration(
    middlewareContainer: MiddlewareContainer,
    moduleRef: Module,
    moduleKey: string,
  ) {
    const { instance } = moduleRef;
    if (!instance.configure) {
      return;
    }
    const middlewareBuilder = new MiddlewareBuilder(
      this.routesMapper,
      this.httpAdapter,
      this.routeInfoPathExtractor,
    );
    try {
      await instance.configure(middlewareBuilder);
    } catch (err) {
      if (!this.appOptions.preview) {
        throw err;
      }
      const warningMessage =
        `Warning! "${moduleRef.name}" module exposes a "configure" method that throws an exception in the preview mode` +
        ` (possibly due to missing dependencies). Note: you can ignore this message, just be aware that some of those conditional middlewares will not be reflected in your graph.`;
      this.logger.warn(warningMessage);
    }

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
  ) {
    const { forRoutes } = config;
    for (const routeInfo of forRoutes) {
      await this.registerRouteMiddleware(
        middlewareContainer,
        routeInfo as RouteInfo,
        config,
        moduleKey,
        applicationRef,
      );
    }
  }

  public async registerRouteMiddleware(
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    moduleKey: string,
    applicationRef: any,
  ) {
    const middlewareCollection = [].concat(config.middleware);
    const moduleRef = this.container.getModuleByKey(moduleKey);

    for (const metatype of middlewareCollection) {
      const collection = middlewareContainer.getMiddlewareCollection(moduleKey);
      const instanceWrapper = collection.get(metatype);
      if (isUndefined(instanceWrapper)) {
        throw new RuntimeException();
      }
      if (instanceWrapper.isTransient) {
        return;
      }
      this.graphInspector.insertClassNode(
        moduleRef,
        instanceWrapper,
        'middleware',
      );
      const middlewareDefinition: Entrypoint<MiddlewareEntrypointMetadata> = {
        type: 'middleware',
        methodName: 'use',
        className: instanceWrapper.name,
        classNodeId: instanceWrapper.id,
        metadata: {
          key: routeInfo.path,
          path: routeInfo.path,
          requestMethod:
            (RequestMethod[routeInfo.method] as keyof typeof RequestMethod) ??
            'ALL',
          version: routeInfo.version,
        },
      };
      this.graphInspector.insertEntrypointDefinition(
        middlewareDefinition,
        instanceWrapper.id,
      );

      await this.bindHandler(
        instanceWrapper,
        applicationRef,
        routeInfo,
        moduleRef,
        collection,
      );
    }
  }

  private async bindHandler(
    wrapper: InstanceWrapper<NestMiddleware>,
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
  ) {
    const { instance, metatype } = wrapper;
    if (isUndefined(instance?.use)) {
      throw new InvalidMiddlewareException(metatype.name);
    }
    const isStatic = wrapper.isDependencyTreeStatic();
    if (isStatic) {
      const proxy = await this.createProxy(instance);
      return this.registerHandler(applicationRef, routeInfo, proxy);
    }

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    await this.registerHandler(
      applicationRef,
      routeInfo,
      async <TRequest, TResponse>(
        req: TRequest,
        res: TResponse,
        next: () => void,
      ) => {
        try {
          const contextId = this.getContextId(req, isTreeDurable);
          const contextInstance = await this.injector.loadPerContext(
            instance,
            moduleRef,
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

  private async createProxy<TRequest = unknown, TResponse = unknown>(
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

  private async registerHandler(
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    proxy: <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void,
  ) {
    const { method } = routeInfo;
    const paths = this.routeInfoPathExtractor.extractPathsFrom(routeInfo);
    const isMethodAll = isRequestMethodAll(method);
    const requestMethod = RequestMethod[method];
    const router = await applicationRef.createMiddlewareFactory(method);
    const middlewareFunction = isMethodAll
      ? proxy
      : <TRequest, TResponse>(
          req: TRequest,
          res: TResponse,
          next: () => void,
        ) => {
          if (applicationRef.getRequestMethod(req) === requestMethod) {
            return proxy(req, res, next);
          }
          return next();
        };
    paths.forEach(path => router(path, middlewareFunction));
  }

  private getContextId(request: unknown, isTreeDurable: boolean): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable ? contextId.payload : request;
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }
}
