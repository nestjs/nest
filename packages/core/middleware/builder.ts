import { iterate } from 'iterare';
import { pathToRegexp } from 'path-to-regexp';
import { LegacyRouteConverter } from '../router/legacy-route-converter.js';
import { RouteInfoPathExtractor } from './route-info-path-extractor.js';
import { RoutesMapper } from './routes-mapper.js';
import { filterMiddleware, isStaticPath } from './utils.js';
import type {
  HttpServer,
  MiddlewareConsumer,
  RequestMethod,
  Type,
} from '@nestjs/common';
import {
  type MiddlewareConfigProxy,
  type MiddlewareConfiguration,
  type RouteInfo,
} from '@nestjs/common/internal';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();

  constructor(
    private readonly routesMapper: RoutesMapper,
    private readonly httpAdapter: HttpServer,
    private readonly routeInfoPathExtractor: RouteInfoPathExtractor,
  ) {}

  public apply(
    ...middleware: Array<Type<any> | Function | Array<Type<any> | Function>>
  ): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(
      this,
      middleware.flat(),
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
      private readonly middleware: Array<Type<any> | Function>,
      private routeInfoPathExtractor: RouteInfoPathExtractor,
    ) {}

    public getExcludedRoutes(): RouteInfo[] {
      return this.excludedRoutes;
    }

    public exclude(
      ...routes: Array<string | RouteInfo>
    ): MiddlewareConfigProxy {
      this.excludedRoutes = [
        ...this.excludedRoutes,
        ...this.getRoutesFlatList(routes).reduce((excludedRoutes, route) => {
          for (const routePath of this.routeInfoPathExtractor.extractPathFrom(
            route,
          )) {
            excludedRoutes.push({
              ...route,
              path: routePath,
            });
          }

          return excludedRoutes;
        }, [] as RouteInfo[]),
      ];

      return this;
    }

    public forRoutes(
      ...routes: Array<string | Type<any> | RouteInfo>
    ): MiddlewareConsumer {
      const { middlewareCollection } = this.builder;

      const flattedRoutes = this.getRoutesFlatList(routes);
      const forRoutes = this.removeOverlappedRoutes(
        this.addCoveredExcludedRoutes(flattedRoutes),
      );
      const configuration = {
        middleware: filterMiddleware(
          this.middleware,
          this.excludedRoutes,
          this.builder.getHttpAdapter(),
          this.routeInfoPathExtractor.getVersioningOptions(),
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

      return iterate(routes)
        .map(route => routesMapper.mapRouteToRouteInfo(route))
        .flatten()
        .toArray();
    }

    /**
     * Adds the routes excluded from the global prefix that a route covers
     * without being excluded itself (e.g. "users/me" for "users/:id"): the
     * router serves them outside of the prefix the route is mounted under.
     */
    private addCoveredExcludedRoutes(routes: RouteInfo[]): RouteInfo[] {
      const allRoutes = [...routes];
      for (const route of routes) {
        for (const excludedRoute of this.routeInfoPathExtractor.extractExcludedRoutesCoveredBy(
          route,
        )) {
          const isListed = allRoutes.some(
            item =>
              item.path === excludedRoute.path &&
              item.method === excludedRoute.method &&
              item.version === excludedRoute.version,
          );
          if (!isListed) {
            allRoutes.push(excludedRoute);
          }
        }
      }
      return allRoutes;
    }

    /**
     * Removes the routes that a parameterized route of the same method is
     * mounted on as well (e.g. "/users/me" next to "/users/:id"), so that
     * the middleware runs once for them. Only a route without parameters or
     * wildcards is removed, and only when the parameterized route matches
     * every path it would be mounted on (global prefix and version included).
     */
    private removeOverlappedRoutes(routes: RouteInfo[]) {
      const routesWithRegex = routes
        .filter(route => route.path.includes(':'))
        .map(route => ({
          method: route.method,
          regexes: this.compileMountPaths(route),
        }));

      return routes.filter(route => {
        const mountPaths = this.routeInfoPathExtractor.extractPathsFrom(route);
        if (!mountPaths.every(isStaticPath)) {
          return true;
        }
        const isOverlapped = (item: {
          method: RequestMethod;
          regexes: RegExp[];
        }): boolean =>
          route.method === item.method &&
          mountPaths.every(path =>
            item.regexes.some(regex => regex.test(path)),
          );
        return !routesWithRegex.some(isOverlapped);
      });
    }

    private compileMountPaths(route: RouteInfo): RegExp[] {
      try {
        return this.routeInfoPathExtractor.extractPathsFrom(route).map(
          path =>
            pathToRegexp(
              LegacyRouteConverter.tryConvert(path.replace(/\$$/, ''), {
                logs: false,
              }),
              { sensitive: true },
            ).regexp,
        );
      } catch {
        // The adapter reports a path it cannot mount; it covers nothing here
        return [];
      }
    }
  };
}
