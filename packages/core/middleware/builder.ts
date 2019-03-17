import { RequestMethod } from '@nestjs/common';
import { flatten } from '@nestjs/common/decorators/core/dependencies.decorator';
import { MiddlewareConsumer, Type } from '@nestjs/common/interfaces';
import {
  MiddlewareConfigProxy,
  RouteInfo,
} from '@nestjs/common/interfaces/middleware';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware } from './utils';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();

  constructor(private readonly routesMapper: RoutesMapper) {}

  public apply(
    ...middleware: Array<Type<any> | Function | any>
  ): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware));
  }

  public build(): MiddlewareConfiguration[] {
    return [...this.middlewareCollection];
  }

  private static readonly ConfigProxy = class implements MiddlewareConfigProxy {
    private excludedRoutes: RouteInfo[] = [];

    constructor(
      private readonly builder: MiddlewareBuilder,
      private readonly middleware: Array<Type<any> | Function | any>,
    ) {}

    public getExcludedRoutes(): RouteInfo[] {
      return this.excludedRoutes;
    }

    public exclude(
      ...routes: Array<string | RouteInfo>
    ): MiddlewareConfigProxy {
      const { routesMapper } = this.builder;
      this.excludedRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteInfo(route)),
      );
      return this;
    }

    public forRoutes(
      ...routes: Array<string | Type<any> | RouteInfo>
    ): MiddlewareConsumer {
      const { middlewareCollection, routesMapper } = this.builder;

      const forRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteInfo(route)),
      );
      const configuration = {
        middleware: filterMiddleware(this.middleware),
        forRoutes: forRoutes.filter(route => !this.isRouteExcluded(route)),
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private mapRoutesToFlatList(forRoutes: RouteInfo[][]): RouteInfo[] {
      return forRoutes.reduce((a, b) => a.concat(b));
    }

    private isRouteExcluded(routeInfo: RouteInfo): boolean {
      const pathLastIndex = routeInfo.path.length - 1;
      const validatedRoutePath =
        routeInfo.path[pathLastIndex] === '/'
          ? routeInfo.path.slice(0, pathLastIndex)
          : routeInfo.path;

      return this.excludedRoutes.some(excluded => {
        const isPathEqual = validatedRoutePath === excluded.path;
        if (!isPathEqual) {
          return false;
        }
        return (
          routeInfo.method === excluded.method ||
          excluded.method === RequestMethod.ALL
        );
      });
    }
  };
}
