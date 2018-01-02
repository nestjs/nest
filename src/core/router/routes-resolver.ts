import { Application } from 'express';
import { NestContainer, InstanceWrapper } from '../injector/container';
import { RouterProxy } from './router-proxy';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { ControllerMappingMessage } from '../helpers/messages';
import { Resolver } from './interfaces/resolver.interface';
import { RouterExceptionFilters } from './router-exception-filters';
import { MetadataScanner } from '../metadata-scanner';
import { RouterExplorer } from './interfaces/explorer.inteface';
import { ExpressRouterExplorer } from './router-explorer';
import { ApplicationConfig } from './../application-config';
import { NotFoundException } from '@nestjs/common';

export class RoutesResolver implements Resolver {
  private readonly logger = new Logger(RoutesResolver.name, true);
  private readonly routerProxy = new RouterProxy();
  private readonly routerExceptionsFilter: RouterExceptionFilters;
  private readonly routerBuilder: RouterExplorer;

  constructor(
    private readonly container: NestContainer,
    private readonly expressAdapter,
    private readonly config: ApplicationConfig,
  ) {
    this.routerExceptionsFilter = new RouterExceptionFilters(config);
    this.routerBuilder = new ExpressRouterExplorer(
      new MetadataScanner(),
      this.routerProxy,
      expressAdapter,
      this.routerExceptionsFilter,
      config,
      this.container,
    );
  }

  public resolve(express: Application) {
    const modules = this.container.getModules();
    modules.forEach(({ routes }, moduleName) =>
      this.setupRouters(routes, moduleName, express),
    );

    this.setupNotFoundHandler(express);
    this.setupExceptionHandler(express);
  }

  public setupRouters(
    routes: Map<string, InstanceWrapper<Controller>>,
    moduleName: string,
    express: Application,
  ) {
    routes.forEach(({ instance, metatype }) => {
      const path = this.routerBuilder.fetchRouterPath(metatype);
      const controllerName = metatype.name;

      this.logger.log(ControllerMappingMessage(controllerName, path));

      const router = this.routerBuilder.explore(instance, metatype, moduleName);
      express.use(path, router);
    });
  }

  public setupNotFoundHandler(express: Application) {
    const callback = (req, res) => {
      throw new NotFoundException(`Cannot ${req.method} ${req.url}`);
    };
    const exceptionHandler = this.routerExceptionsFilter.create(
      {},
      callback as any,
    );
    const proxy = this.routerProxy.createProxy(callback, exceptionHandler);
    express.use(proxy);
  }

  public setupExceptionHandler(express: Application) {
    const callback = (err, req, res, next) => {
      throw err;
    };
    const exceptionHandler = this.routerExceptionsFilter.create(
      {},
      callback as any,
    );
    const proxy = this.routerProxy.createExceptionLayerProxy(
      callback,
      exceptionHandler,
    );
    express.use(proxy);
  }
}
