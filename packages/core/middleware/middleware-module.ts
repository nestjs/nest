import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { MiddlewareConfiguration, RouteInfo } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middleware/nest-middleware.interface';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { NestContainer } from '../injector/container';
import { Module } from '../injector/module';
import { RouterExceptionFilters } from '../router/router-exception-filters';
import { RouterProxy } from '../router/router-proxy';
import { MiddlewareBuilder } from './builder';
import { MiddlewareContainer, MiddlewareWrapper } from './container';
import { MiddlewareResolver } from './resolver';
import { RoutesMapper } from './routes-mapper';

export class MiddlewareModule {
  private readonly routerProxy = new RouterProxy();
  private routerExceptionFilter: RouterExceptionFilters;
  private routesMapper: RoutesMapper;
  private resolver: MiddlewareResolver;
  private config: ApplicationConfig;

  public async register(
    middlewareContainer: MiddlewareContainer,
    container: NestContainer,
    config: ApplicationConfig,
  ) {
    const appRef = container.getApplicationRef();
    this.routerExceptionFilter = new RouterExceptionFilters(
      container,
      config,
      appRef,
    );
    this.routesMapper = new RoutesMapper(container);
    this.resolver = new MiddlewareResolver(middlewareContainer);
    this.config = config;

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
    module: string,
  ) {
    if (!instance.configure) return;

    const middlewareBuilder = new MiddlewareBuilder(this.routesMapper);
    instance.configure(middlewareBuilder);

    if (!(middlewareBuilder instanceof MiddlewareBuilder)) return;

    const config = middlewareBuilder.build();
    middlewareContainer.addConfig(config, module);
  }

  public async registerMiddleware(
    middlewareContainer: MiddlewareContainer,
    applicationRef: any,
  ) {
    const configs = middlewareContainer.getConfigs();
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
      [...configs.entries()].map(async ([module, moduleConfigs]) => {
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
      forRoutes.map(async (routeInfo: RouteInfo) => {
        await this.registerRouteMiddleware(
          middlewareContainer,
          routeInfo,
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
    module: string,
    applicationRef: any,
  ) {
    const middlewareCollection = [].concat(config.middleware);
    await Promise.all(
      middlewareCollection.map(async (metatype: Type<NestMiddleware>) => {
        const collection = middlewareContainer.getMiddleware(module);
        const middleware = collection.get(metatype.name);
        if (isUndefined(middleware)) {
          throw new RuntimeException();
        }

        const { instance } = middleware as MiddlewareWrapper;
        await this.bindHandler(
          instance,
          metatype,
          applicationRef,
          routeInfo.method,
          routeInfo.path,
        );
      }),
    );
  }

  private async bindHandler(
    instance: NestMiddleware,
    metatype: Type<NestMiddleware>,
    applicationRef: HttpServer,
    method: RequestMethod,
    path: string,
  ) {
    if (isUndefined(instance.resolve)) {
      throw new InvalidMiddlewareException(metatype.name);
    }
    const exceptionsHandler = this.routerExceptionFilter.create(
      instance,
      instance.resolve,
      undefined,
    );
    const router = applicationRef.createMiddlewareFactory(method);
    const bindWithProxy = middlewareInstance =>
      this.bindHandlerWithProxy(
        exceptionsHandler,
        router,
        middlewareInstance,
        path,
      );
    const resolve = instance.resolve();

    const middleware = await resolve;
    bindWithProxy(middleware);
  }

  private bindHandlerWithProxy(
    exceptionsHandler: ExceptionsHandler,
    router: (...args) => void,
    middleware: (req, res, next) => void,
    path: string,
  ) {
    const proxy = this.routerProxy.createProxy(middleware, exceptionsHandler);
    const prefix = this.config.getGlobalPrefix();
    const basePath = prefix ? validatePath(prefix) : '';
    router(basePath + path, proxy);
  }
}
