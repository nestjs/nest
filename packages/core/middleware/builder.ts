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
import { stripEndSlash } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { RouteInfoPathExtractor } from './route-info-path-extractor';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware } from './utils';

type MiddlewareConfigurationContext = {
  middleware: (Type<any> | Function)[];
  routes: RouteInfo[];
  excludedRoutes: RouteInfo[];
};

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareConfigurationContexts: MiddlewareConfigurationContext[] =
    [];

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

  public replace(
    middlewareToReplace: Type<any> | Function,
    ...middlewareReplacements: Array<Type<any> | Function>
  ): MiddlewareBuilder {
    for (const currentConfigurationContext of this
      .middlewareConfigurationContexts) {
      currentConfigurationContext.middleware = flatten(
        currentConfigurationContext.middleware.map(middleware =>
          middleware === middlewareToReplace
            ? middlewareReplacements
            : middleware,
        ),
      ) as (Type<any> | Function)[];
    }

    return this;
  }

  public getMiddlewareConfigurationContexts(): MiddlewareConfigurationContext[] {
    return this.middlewareConfigurationContexts;
  }

  public build(): MiddlewareConfiguration[] {
    return this.middlewareConfigurationContexts.map(
      ({ middleware, routes, excludedRoutes }) => ({
        middleware: filterMiddleware(
          middleware,
          excludedRoutes,
          this.getHttpAdapter(),
        ),
        forRoutes: routes,
      }),
    );
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
      const { middlewareConfigurationContexts } = this.builder;

      const flattedRoutes = this.getRoutesFlatList(routes);
      const forRoutes = this.removeOverlappedRoutes(flattedRoutes);

      middlewareConfigurationContexts.push({
        middleware: this.middleware,
        routes: forRoutes,
        excludedRoutes: this.excludedRoutes,
      });

      return this.builder;
    }

    private getRoutesFlatList(
      routes: Array<string | Type<any> | RouteInfo>,
    ): RouteInfo[] {
      const { routesMapper } = this.builder;

      return iterate(routes)
        .map(route => routesMapper.mapRouteToRouteInfo(route))
        .flatten()
        .toArray();
    }

    private removeOverlappedRoutes(routes: RouteInfo[]) {
      const regexMatchParams = /(:[^\/]*)/g;
      const wildcard = '([^/]*)';
      const routesWithRegex = routes
        .filter(route => route.path.includes(':'))
        .map(route => ({
          method: route.method,
          path: route.path,
          regex: new RegExp(
            '^(' + route.path.replace(regexMatchParams, wildcard) + ')$',
            'g',
          ),
        }));

      return routes.filter(route => {
        const isOverlapped = (item: { regex: RegExp } & RouteInfo): boolean => {
          if (route.method !== item.method) {
            return false;
          }
          const normalizedRoutePath = stripEndSlash(route.path);
          return (
            normalizedRoutePath !== item.path &&
            item.regex.test(normalizedRoutePath)
          );
        };
        const routeMatch = routesWithRegex.find(isOverlapped);
        return routeMatch === undefined;
      });
    }
  };
}
