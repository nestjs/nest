import { RequestMethod } from '@nestjs/common';
import {
  HttpServer,
  RouteInfo,
  RouteMatchingOptions,
  Type,
} from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isFunction,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { pathToRegexp } from 'path-to-regexp';
import { uid } from 'uid';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';
import { LegacyRouteConverter } from '../router/legacy-route-converter';
import { isRouteExcluded } from '../router/utils';

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

const EXACT_ROUTE_MATCHING: RouteMatchingOptions = {
  caseSensitive: true,
  ignoreTrailingSlash: false,
};

/**
 * Characters with a meaning in a route path (parameters, wildcards, groups),
 * and the "$" that marks an exact-match path.
 */
const ROUTE_PATTERN_CHARS = /[:*?+()[\]{}!\\$]/;

/**
 * Tells whether a route path matches no other path than itself.
 */
export function isStaticPath(path: string): boolean {
  return !ROUTE_PATTERN_CHARS.test(path);
}

export const filterMiddleware = <T extends Function | Type<any> = any>(
  middleware: T[],
  routes: RouteInfo[],
  httpAdapter: HttpServer,
) => {
  // Excluded routes must match exactly the requests the router serves with
  // them, as the middleware is skipped for every request they match. When
  // the adapter does not tell how its router matches paths, they match
  // exactly, so that a more lenient router runs the middleware for the
  // variants of an excluded path rather than skipping it
  const excludedRoutes = mapToExcludeRoute(
    routes,
    httpAdapter.getRouteMatchingOptions?.() ?? EXACT_ROUTE_MATCHING,
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
  // Such request targets are routed by another path than the one matched
  // here: the routers end the path at "#" (Express then also reads "\" as
  // "/"), and route an absolute-form target by the path it contains. Clients
  // send neither to a server (only proxies get the absolute form), so the
  // middleware runs for them
  if (!originalUrl?.startsWith('/') || originalUrl.includes('#')) {
    return false;
  }
  const queryParamsIndex = originalUrl.indexOf('?');
  const pathname =
    queryParamsIndex >= 0
      ? originalUrl.slice(0, queryParamsIndex)
      : originalUrl;

  return isRouteExcluded(excludedRoutes, pathname, RequestMethod[reqMethod]);
}
