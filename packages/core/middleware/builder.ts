import { RequestMethod } from '@nestjs/common';
import { flatten } from '@nestjs/common/decorators/core/dependencies.decorator';
import { MiddlewareConsumer, Type } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy, RouteInfo } from '@nestjs/common/interfaces/middleware';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { BindResolveMiddlewareValues } from '@nestjs/common/utils/bind-resolve-values.util';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware } from './utils';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();
  constructor(private readonly routesMapper: RoutesMapper) {}

  public apply(
    ...middleware: Array<Type<any> | Function | any>,
  ): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware));
  }

  public build() {
    return [...this.middlewareCollection];
  }

  private bindValuesToResolve(
    middleware: Type<any> | Type<any>[],
    resolveParams: any[],
  ) {
    if (isNil(resolveParams)) {
      return middleware;
    }
    const bindArgs = BindResolveMiddlewareValues(resolveParams);
    return [].concat(middleware).map(bindArgs);
  }

  private static ConfigProxy = class implements MiddlewareConfigProxy {
    private contextParameters = null;
    private excludedRoutes: RouteInfo[] = [];
    private includedRoutes: any[];

    constructor(private readonly builder: MiddlewareBuilder, middleware) {
      this.includedRoutes = filterMiddleware(middleware);
    }

    public with(...args): MiddlewareConfigProxy {
      this.contextParameters = args;
      return this;
    }

    public exclude(
      ...routes: Array<string | RouteInfo>,
    ): MiddlewareConfigProxy {
      const { routesMapper } = this.builder;
      this.excludedRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteInfo(route)),
      );
      return this;
    }

    public forRoutes(
      ...routes: Array<string | Type<any> | RouteInfo>,
    ): MiddlewareConsumer {
      const {
        middlewareCollection,
        bindValuesToResolve,
        routesMapper,
      } = this.builder;

      const forRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteInfo(route)),
      );
      const configuration = {
        middleware: bindValuesToResolve(
          this.includedRoutes,
          this.contextParameters,
        ),
        forRoutes: forRoutes.filter(route => !this.isRouteExcluded(route)),
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private mapRoutesToFlatList(forRoutes): RouteInfo[] {
      return forRoutes.reduce((a, b) => a.concat(b));
    }

    private isRouteExcluded(routeInfo: RouteInfo): boolean {
      return this.excludedRoutes.some(excluded => {
        const pathLastIndex = routeInfo.path.length - 1;
        const validatedRoutePath =
          routeInfo.path[pathLastIndex] === '/'
            ? routeInfo.path.slice(0, pathLastIndex)
            : routeInfo.path;

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
