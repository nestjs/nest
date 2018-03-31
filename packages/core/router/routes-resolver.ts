import { NestContainer, InstanceWrapper } from '../injector/container';
import { RouterProxy } from './router-proxy';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { controllerMappingMessage } from '../helpers/messages';
import { Resolver } from './interfaces/resolver.interface';
import { RouterExceptionFilters } from './router-exception-filters';
import { MetadataScanner } from '../metadata-scanner';
import { RouterExplorer } from './router-explorer';
import { ApplicationConfig } from './../application-config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants';
import { HttpServer } from '@nestjs/common/interfaces';

export class RoutesResolver implements Resolver {
  private readonly logger = new Logger(RoutesResolver.name, true);
  private readonly routerProxy = new RouterProxy();
  private readonly routerExceptionsFilter: RouterExceptionFilters;
  private readonly routerBuilder: RouterExplorer;

  constructor(
    private readonly container: NestContainer,
    private readonly config: ApplicationConfig,
  ) {
    this.routerExceptionsFilter = new RouterExceptionFilters(
      container,
      config,
      container.getApplicationRef(),
    );
    this.routerBuilder = new RouterExplorer(
      new MetadataScanner(),
      this.container,
      this.routerProxy,
      this.routerExceptionsFilter,
      this.config,
    );
  }

  public resolve(appInstance, basePath: string) {
    const modules = this.container.getModules();
    modules.forEach(({ routes, metatype }, moduleName) => {
      let path = metatype
        ? Reflect.getMetadata(MODULE_PATH, metatype)
        : undefined;
      path = path ? path + basePath : basePath;
      this.registerRouters(routes, moduleName, path, appInstance);
    });
    this.registerNotFoundHandler();
    this.registerExceptionHandler();
  }

  public registerRouters(
    routes: Map<string, InstanceWrapper<Controller>>,
    moduleName: string,
    basePath: string,
    appInstance: HttpServer,
  ) {
    routes.forEach(({ instance, metatype }) => {
      const path = this.routerBuilder.extractRouterPath(metatype, basePath);
      const controllerName = metatype.name;

      this.logger.log(controllerMappingMessage(controllerName, path));
      this.routerBuilder.explore(
        instance,
        metatype,
        moduleName,
        appInstance,
        path,
      );
    });
  }

  public registerNotFoundHandler() {
    const applicationRef = this.container.getApplicationRef();
    const callback = (req, res) => {
      const method = applicationRef.getRequestMethod(req);
      const url = applicationRef.getRequestUrl(req);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.routerExceptionsFilter.create(
      {},
      callback as any,
      undefined,
    );
    const proxy = this.routerProxy.createProxy(callback, handler);
    applicationRef.setNotFoundHandler &&
      applicationRef.setNotFoundHandler(proxy);
  }

  public registerExceptionHandler() {
    const callback = (err, req, res, next) => {
      throw this.mapExternalException(err);
    };
    const handler = this.routerExceptionsFilter.create(
      {},
      callback as any,
      undefined,
    );
    const proxy = this.routerProxy.createExceptionLayerProxy(callback, handler);
    const applicationRef = this.container.getApplicationRef();
    applicationRef.setErrorHandler && applicationRef.setErrorHandler(proxy);
  }

  public mapExternalException(err: any) {
    switch (true) {
      case err instanceof SyntaxError:
        return new BadRequestException(err.message);
      default:
        return err;
    }
  }
}
