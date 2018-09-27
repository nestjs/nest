import {
  Inject,
  Injectable,
  Injector,
  NestContainer,
  Type,
  Utils,
} from '@nest/core';

import { MiddlewareContainer } from './middleware-container.service';
import { MiddlewareResolver } from './middleware-resolver.service';
import { MiddlewareBuilder } from './middleware-builder.service';
import { RoutesMapper } from './routes-mapper.service';
import { InvalidMiddlewareException } from '../errors';
import { RequestMethod } from '../enums';
import { HTTP_SERVER } from '../tokens';

import {
  HttpServer,
  MiddlewareConfiguration,
  MiddlewareConfigure,
  NestMiddleware,
  RouteInfo,
  ServerFeatureOptions,
} from '../interfaces';

@Injectable()
export class Middleware {
  @Inject(HTTP_SERVER)
  private readonly httpServer: HttpServer;

  constructor(
    private readonly middlewareContainer: MiddlewareContainer,
    private readonly resolver: MiddlewareResolver,
    private readonly routesMapper: RoutesMapper,
    private readonly container: NestContainer,
  ) {}

  /*public async register() {
    const modules = this.container.getModules();
    await this.resolveMiddleware(modules);
  }*/

  // @TODO: Resolve middleware per module initialization
  public async resolveMiddleware(
    controllers: Type<any>[],
    options: ServerFeatureOptions,
    injector: Injector,
  ) {
    this.loadConfiguration(controllers, injector, options);

    await Promise.all(
      controllers.map(async controller => {
        const instance = injector.get(controller);

        // const instance = this.container.getModule(token);
      }),
    );
  }

  public loadConfiguration(
    controllers: Type<any>[],
    options: ServerFeatureOptions,
    injector: Injector,
  ) {
    if (!options.configure) return;

    const { configure } = injector.get<MiddlewareConfigure>(options.configure);
    const middlewareBuilder = new MiddlewareBuilder(this.routesMapper);

    configure(middlewareBuilder);

    const config = middlewareBuilder.build();
    this.middlewareContainer.addConfig(config, controllers);
  }

  public async register() {
    const configs = this.middlewareContainer.getConfigs();
    const registerAllConfigs = (
      controllers: Type<any>[],
      middlewareConfig: MiddlewareConfiguration[],
    ) =>
      middlewareConfig.map(async config => {
        await this.registerMiddlewareConfig(config, controllers);
      });

    await Promise.all(
      [...configs.entries()].map(async ([controllers, controllerConfigs]) => {
        await Promise.all(
          registerAllConfigs(controllers, [...controllerConfigs]),
        );
      }),
    );
  }

  private async registerMiddlewareConfig(
    config: MiddlewareConfiguration,
    controllers: Type<any>[],
  ) {
    const { forRoutes } = config;

    await Promise.all(
      forRoutes.map(async (routeInfo: Type<any> | string | RouteInfo) => {
        await this.registerRouteMiddleware(
          <RouteInfo>routeInfo,
          config,
          controllers,
        );
      }),
    );
  }

  private async registerRouteMiddleware(
    routeInfo: RouteInfo,
    config: MiddlewareConfiguration,
    controllers: Type<any>[],
  ) {
    const middlewareCollection = [].concat(config.middleware);

    await Promise.all();
  }

  private async bindHandler(
    instance: NestMiddleware,
    method: keyof RequestMethod,
    path: string,
  ) {
    if (Utils.isUndefined(instance.resolve)) {
      throw new InvalidMiddlewareException(instance.constructor.name);
    }
  }
}
