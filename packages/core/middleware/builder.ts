import { flatten } from '@nestjs/common/decorators/core/dependencies.decorator';
import {
  HttpServer,
  MiddlewareConsumer,
  Type,
} from '@nestjs/common/interfaces';
import {
  MiddlewareConfigProxy,
  MiddlewareConfiguration,
  RouteInfo,
} from '@nestjs/common/interfaces/middleware';
import { iterate } from 'iterare';
import { RouteInfoPathExtractor } from './route-info-path-extractor';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware } from './utils';
import { stripEndSlash } from '@nestjs/common/utils/shared.utils';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();

  constructor(
    private readonly routesMapper: RoutesMapper,
    private readonly httpAdapter: HttpServer,
    private readonly routeInfoPathExtractor: RouteInfoPathExtractor,
  ) {}

  public apply(
    ...middleware: Array<Type<any> | Function | any>
  ): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(
      this,
      flatten(middleware),
      this.routeInfoPathExtractor,
    );
  }

  public build(): MiddlewareConfiguration[] {
    return [...this.middlewareCollection];
  }

  public getHttpAdapter(): HttpServer {
    return this.httpAdapter;
  }

  private static readonly ConfigProxy = class implements MiddlewareConfigProxy {
    private excludedRoutes: RouteInfo[] = [];

    constructor(
      private readonly builder: MiddlewareBuilder,
      private readonly middleware: Array<Type<any> | Function | any>,
      private routeInfoPathExtractor: RouteInfoPathExtractor,
    ) {}

    public getExcludedRoutes(): RouteInfo[] {
      return this.excludedRoutes;
    }

    public exclude(
      ...routes: Array<string | RouteInfo>
    ): MiddlewareConfigProxy {
      this.excludedRoutes = this.getRoutesFlatList(routes).map(route => ({
        ...route,
        path: this.routeInfoPathExtractor.extractPathFrom(route),
      }));
      return this;
    }

    public forRoutes(
      ...routes: Array<string | Type<any> | RouteInfo>
    ): MiddlewareConsumer {
      const { middlewareCollection } = this.builder;

      const forRoutes = this.getRoutesFlatList(routes);
      const configuration = {
        middleware: filterMiddleware(
          this.middleware,
          this.excludedRoutes,
          this.builder.getHttpAdapter(),
        ),
        forRoutes,
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private getRoutesFlatList(
      routes: Array<string | Type<any> | RouteInfo>,
    ): RouteInfo[] {
      const { routesMapper } = this.builder;

      const routesWithNoEndingSlash: Array<RouteInfo> = iterate(routes)
        .map(route => routesMapper.mapRouteToRouteInfo(route))
        .flatten()
        .toArray()
        .map(route => {
          const path = stripEndSlash(route.path);
          return { ...route, path };
        });

      const routesWithAnEndingSlash: Array<RouteInfo> =
        routesWithNoEndingSlash.map(route => {
          const path = route.path + '/';
          return { ...route, path };
        });

      return [
        ...routesWithNoEndingSlash,
        ...routesWithAnEndingSlash,
      ] as Array<RouteInfo>;
    }
  };
}
