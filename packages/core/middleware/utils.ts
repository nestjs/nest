import { RequestMethod } from '@nestjs/common';
import { HttpServer, RouteInfo, Type } from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isFunction,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import * as pathToRegexp from 'path-to-regexp';
import { uid } from 'uid';
import {
  ExcludeRouteMetadata,
  RouteMetadata,
} from '../router/interfaces/exclude-route-metadata.interface';
import { isMethodMatch, isRouteExcluded } from '../router/utils';
export const mapToExcludeRoute = (
  routes: (string | RouteInfo)[],
): ExcludeRouteMetadata[] => {
  return routes.map(route => {
    if (isString(route)) {
      return {
        path: route,
        requestMethod: RequestMethod.ALL,
        pathRegex: pathToRegexp(addLeadingSlash(route)),
      };
    }
    return {
      path: route.path,
      requestMethod: route.method,
      pathRegex: pathToRegexp(addLeadingSlash(route.path)),
    };
  });
};

export const filterMiddleware = <T extends Function | Type<any> = any>(
  middleware: T[],
  includedRoutes: RouteInfo[],
  excludedRoutes: RouteInfo[],
  httpAdapter: HttpServer,
) => {
  return iterate([])
    .concat(middleware)
    .filter(isFunction)
    .map((item: T) =>
      mapToClass(
        item,
        mapToExcludeRoute(includedRoutes),
        mapToExcludeRoute(excludedRoutes),
        httpAdapter,
      ),
    )
    .toArray();
};

export const mapToClass = <T extends Function | Type<any>>(
  middleware: T,
  includedRoutes: RouteMetadata[],
  excludedRoutes: RouteMetadata[],
  httpAdapter: HttpServer,
) => {
  if (isMiddlewareClass(middleware)) {
    if (excludedRoutes.length <= 0) {
      return middleware;
    }
    const MiddlewareHost = class extends (middleware as Type<any>) {
      use(...params: unknown[]) {
        const [req, _, next] = params as [Record<string, any>, any, Function];
        const isExcluded = isMiddlewareRouteExcluded(
          req,
          includedRoutes,
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
          includedRoutes,
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
  includedRoutes: RouteMetadata[],
  excludedRoutes: RouteMetadata[],
  httpAdapter: HttpServer,
): boolean {
  if (excludedRoutes.length <= 0) {
    return false;
  }
  const reqMethod = httpAdapter.getRequestMethod(req);
  const originalUrl = httpAdapter.getRequestUrl(req);
  const queryParamsIndex = originalUrl && originalUrl.indexOf('?');
  const pathname =
    queryParamsIndex >= 0
      ? originalUrl.slice(0, queryParamsIndex)
      : originalUrl;

  let isExcluded = false;
  for (const route of excludedRoutes) {
    if (
      pathname === route.path &&
      isMethodMatch(route.requestMethod, RequestMethod[reqMethod])
    ) {
      return true;
    } else {
      isExcluded = isRouteExcluded(
        excludedRoutes,
        pathname,
        RequestMethod[reqMethod],
      );
    }
  }

  for (const route of includedRoutes) {
    if (
      pathname === route.path &&
      isMethodMatch(route.requestMethod, RequestMethod[reqMethod])
    ) {
      return false;
    }
  }

  return isExcluded;
}
