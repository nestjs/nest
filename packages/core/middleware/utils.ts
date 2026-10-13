import { RequestMethod } from '@nestjs/common';
import { iterate } from 'iterare';
import { pathToRegexp } from 'path-to-regexp';
import { uid } from 'uid';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface.js';
import { LegacyRouteConverter } from '../router/legacy-route-converter.js';
import { isRouteExcluded } from '../router/utils/index.js';
import type { HttpServer, Type } from '@nestjs/common';
import {
  type RouteInfo,
  type RouteMatchingOptions,
  addLeadingSlash,
  isFunction,
  isString,
} from '@nestjs/common/internal';

/**
 * Compiles the given routes into exclusion matchers. Without
 * `matchingOptions`, paths match case-insensitively and ignoring a trailing
 * slash; pass the router's {@link RouteMatchingOptions} to match requests
 * exactly like the router does.
 */
export const mapToExcludeRoute = (
  routes: (string | RouteInfo)[],
  matchingOptions?: RouteMatchingOptions,
): ExcludeRouteMetadata[] => {
  return routes.map(route => {
    const originalPath = isString(route) ? route : route.path;
    const path = LegacyRouteConverter.tryConvert(originalPath);

    try {
      const pathRegex = compileExcludedPath(path, matchingOptions);
      if (isString(route)) {
        return {
          path,
          requestMethod: RequestMethod.ALL,
          pathRegex,
        };
      }
      return {
        path,
        requestMethod: route.method,
        pathRegex,
      };
    } catch (e) {
      if (e instanceof TypeError) {
        LegacyRouteConverter.printError(originalPath);
      }
      throw e;
    }
  });
};

function compileExcludedPath(
  path: string,
  matchingOptions?: RouteMatchingOptions,
): RegExp {
  if (!matchingOptions) {
    return pathToRegexp(addLeadingSlash(path)).regexp;
  }
  // Routes are registered without a trailing slash, so "users/login/" must
  // match the requests the router serves with the "users/login" route
  const routePath = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return pathToRegexp(addLeadingSlash(routePath) || '/', {
    sensitive: matchingOptions.caseSensitive,
    trailing: matchingOptions.ignoreTrailingSlash,
  }).regexp;
}

export const filterMiddleware = <T extends Function | Type<any> = any>(
  middleware: T[],
  routes: RouteInfo[],
  httpAdapter: HttpServer,
) => {
  // Excluded routes must match exactly the requests the router serves with
  // them, as the middleware is skipped for every request they match
  const excludedRoutes = mapToExcludeRoute(
    routes,
    httpAdapter.getRouteMatchingOptions?.(),
  );
  return iterate([])
    .concat(middleware)
    .filter(isFunction)
    .map((item: T) => mapToClass(item, excludedRoutes, httpAdapter))
    .toArray();
};

export const mapToClass = <T extends Function | Type<any>>(
  middleware: T,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
) => {
  if (isMiddlewareClass(middleware)) {
    if (excludedRoutes.length <= 0) {
      return middleware;
    }
    const MiddlewareHost = class extends middleware {
      use(...params: unknown[]) {
        const [req, _, next] = params as [Record<string, any>, any, Function];
        const isExcluded = isMiddlewareRouteExcluded(
          req,
          excludedRoutes,
          httpAdapter,
        );
        if (isExcluded) {
          return next();
        }
        return super.use(...params);
      }
    };
    return assignToken(MiddlewareHost, middleware.name);
  }
  return assignToken(
    class {
      use = (...params: unknown[]) => {
        const [req, _, next] = params as [Record<string, any>, any, Function];
        const isExcluded = isMiddlewareRouteExcluded(
          req,
          excludedRoutes,
          httpAdapter,
        );
        if (isExcluded) {
          return next();
        }
        return (middleware as Function)(...params);
      };
    },
  );
};

export function isMiddlewareClass(middleware: any): middleware is Type<any> {
  const middlewareStr = middleware.toString();
  if (middlewareStr.substring(0, 5) === 'class') {
    return true;
  }
  const middlewareArr = middlewareStr.split(' ');
  return (
    middlewareArr[0] === 'function' &&
    /[A-Z]/.test(middlewareArr[1]?.[0]) &&
    isFunction(middleware.prototype?.use)
  );
}

export function assignToken(metatype: Type<any>, token = uid(21)): Type<any> {
  Object.defineProperty(metatype, 'name', { value: token });
  return metatype;
}

export function isMiddlewareRouteExcluded(
  req: Record<string, any>,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
): boolean {
  if (excludedRoutes.length <= 0) {
    return false;
  }
  const reqMethod = httpAdapter.getRequestMethod!(req);
  const originalUrl = httpAdapter.getRequestUrl!(req);
  const queryParamsIndex = originalUrl ? originalUrl.indexOf('?') : -1;
  const pathname =
    queryParamsIndex >= 0
      ? originalUrl.slice(0, queryParamsIndex)
      : originalUrl;

  // HEAD requests are served by GET handlers, so a GET exclusion covers them too
  return (
    isRouteExcluded(excludedRoutes, pathname, RequestMethod[reqMethod]) ||
    (reqMethod === RequestMethod[RequestMethod.HEAD] &&
      isRouteExcluded(excludedRoutes, pathname, RequestMethod.GET))
  );
}
