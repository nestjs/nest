import { RequestMethod } from '@nestjs/common';
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
import { pathToRegexp } from 'path-to-regexp';
import { LegacyRouteConverter } from '../router/legacy-route-converter';
import { RouteInfoPathExtractor } from './route-info-path-extractor';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware, isStaticPath } from './utils';

/**
 * Returns the path the router serves the routes of a mount path at, which is
 * also the path the adapters mount it on: without the "$" that marks an
 * exact-match path, and without a trailing slash.
 */
const toServedPath = (mountPath: string): string =>
  mountPath.replace(/\$$/, '').replace(/\/+$/, '') || '/';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();
  private servedRoutes?: RouteInfo[];

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

  /**
   * Returns the routes of the controllers of the application at the paths
   * the router serves them at (global prefix and version included).
   */
  public getServedRoutes(): RouteInfo[] {
    return (this.servedRoutes ??= this.routesMapper
      .mapControllersToRouteInfo()
      .flatMap(route =>
        this.routeInfoPathExtractor
          .extractPathsFrom(route)
          .map(path => ({ ...route, path: toServedPath(path) })),
      ));
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
          () => this.builder.getServedRoutes(),
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
     *
     * The paths are compared as the router serves them, without a trailing
     * slash: the root route of a controller is mounted on "/cats/" and served
     * at "/cats", which "/:id/{*path}" matches only with the slash.
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
            item.regexes.some(regex => regex.test(toServedPath(path))),
          );
        return !routesWithRegex.some(isOverlapped);
      });
    }

    private compileMountPaths(route: RouteInfo): RegExp[] {
      try {
        return this.routeInfoPathExtractor.extractPathsFrom(route).map(
          path =>
            pathToRegexp(
              LegacyRouteConverter.tryConvert(toServedPath(path), {
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
