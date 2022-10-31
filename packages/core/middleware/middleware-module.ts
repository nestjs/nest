import { HttpServer, VersioningType } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  MiddlewareConfiguration,
  RouteInfo,
  NestMiddleware,
} from '@nestjs/common/interfaces/middleware';
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
import { InstanceToken, Module } from '../injector/module';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants';
import { RoutePathFactory } from '../router/route-path-factory';
import { RouterExceptionFilters } from '../router/router-exception-filters';
import { RouterProxy } from '../router/router-proxy';
import { isRequestMethodAll, isRouteExcluded } from '../router/utils';
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
  private httpAdapter: HttpServer;

  constructor(private readonly routePathFactory: RoutePathFactory) {}

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
    collection: Map<InstanceToken, InstanceWrapper>,
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
    await this.registerHandler(
      applicationRef,
      routeInfo,
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
            this.container.registerRequestProvider(
              contextId.getParent ? contextId.payload : req,
              contextId,
            );
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
    { path, method, version }: RouteInfo,
    proxy: <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void,
  ) {
    const prefix = this.config.getGlobalPrefix();
    const excludedRoutes = this.config.getGlobalPrefixOptions().exclude;
    if (
      (Array.isArray(excludedRoutes) &&
        isRouteExcluded(excludedRoutes, path, method)) ||
      ['*', '/*', '(.*)', '/(.*)'].includes(path)
    ) {
      path = addLeadingSlash(path);
    } else {
      const basePath = addLeadingSlash(prefix);
      if (basePath?.endsWith('/') && path?.startsWith('/')) {
        // strip slash when a wildcard is being used
        // and global prefix has been set
        path = path?.slice(1);
      }
      path = basePath + path;
    }

    const applicationVersioningConfig = this.config.getVersioning();
    if (version && applicationVersioningConfig.type === VersioningType.URI) {
      const versionPrefix = this.routePathFactory.getVersionPrefix(
        applicationVersioningConfig,
      );
      path = `/${versionPrefix}${version.toString()}${path}`;
    }

    const isMethodAll = isRequestMethodAll(method);
    const requestMethod = RequestMethod[method];
    const router = await applicationRef.createMiddlewareFactory(method);
    router(
      path,
      isMethodAll
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
          },
    );
  }
}
