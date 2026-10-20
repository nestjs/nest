import {
  RequestMethod,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
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
  isUndefined,
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
      const excludedRoute: ExcludeRouteMetadata = {
        path,
        requestMethod: route.method,
        pathRegex,
      };
      if (route.version) {
        excludedRoute.version = route.version;
      }
      return excludedRoute;
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
  versioningOptions?: VersioningOptions,
) => {
  // Excluded routes must match exactly the requests the router serves with
  // them, as the middleware is skipped for every request they match. When
  // the adapter does not tell how its router matches paths, they match
  // exactly, so that a more lenient router runs the middleware for the
  // variants of an excluded path rather than skipping it
  const matchingOptions =
    httpAdapter.getRouteMatchingOptions?.() ?? EXACT_ROUTE_MATCHING;
  const excludedRoutes = mapToExcludeRoute(routes, matchingOptions);
  return iterate([])
    .concat(middleware)
    .filter(isFunction)
    .map((item: T) =>
      mapToClass(
        item,
        excludedRoutes,
        httpAdapter,
        matchingOptions.ignoreTrailingSlash,
        versioningOptions,
      ),
    )
    .toArray();
};

export const mapToClass = <T extends Function | Type<any>>(
  middleware: T,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
  ignoreTrailingSlash = false,
  versioningOptions?: VersioningOptions,
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
          ignoreTrailingSlash,
          versioningOptions,
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
          ignoreTrailingSlash,
          versioningOptions,
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
  ignoreTrailingSlash = false,
  versioningOptions?: VersioningOptions,
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

  // HEAD requests are served by GET handlers, so a GET exclusion covers them too
  const isRequestForRoute = (route: ExcludeRouteMetadata, path: string) =>
    isRouteExcluded([route], path, RequestMethod[reqMethod]) ||
    (reqMethod === RequestMethod[RequestMethod.HEAD] &&
      isRouteExcluded([route], path, RequestMethod.GET));
  const isVersionRequested = createRequestedVersionMatcher(
    req,
    versioningOptions,
  );
  const isExcluded = (path: string) =>
    excludedRoutes.some(
      route => isRequestForRoute(route, path) && isVersionRequested(route),
    );

  // A router that ignores a trailing slash serves "/x/" with the "/x" route,
  // which an exclusion that matches "/x/" may not cover (e.g. "x/{*path}"),
  // so the request is excluded only if its path without the slash is too
  if (ignoreTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
    return isExcluded(pathname) && isExcluded(pathname.replace(/\/+$/, ''));
  }
  return isExcluded(pathname);
}

/**
 * Returns a function that tells whether the request asks for the version of
 * an excluded route. With header, media type and custom versioning, the
 * version is not part of the path, so an excluded route of a version covers
 * the requests for that version only. The versions of the request are read
 * as the version filters of the HTTP adapters read them, once, and only for
 * a route that has a version.
 *
 * A request that asks for several versions (custom versioning) may be served
 * by a route of any of them, so all of them must be versions of the excluded
 * route. A request whose versions cannot be read is not excluded, and an
 * excluded route that is only version-neutral covers every request, as the
 * router serves it for the versions no other route takes.
 */
export function createRequestedVersionMatcher(
  request: Record<string, any>,
  versioningOptions?: VersioningOptions,
): (route: ExcludeRouteMetadata) => boolean {
  let requestedVersions: string[] | null | undefined;
  return ({ version }) => {
    if (
      !version ||
      version === VERSION_NEUTRAL ||
      !versioningOptions ||
      versioningOptions.type === VersioningType.URI
    ) {
      return true;
    }
    if (requestedVersions === undefined) {
      requestedVersions = getRequestedVersions(request, versioningOptions);
    }
    if (!requestedVersions) {
      return false;
    }
    const versions: unknown[] = Array.isArray(version) ? version : [version];
    return requestedVersions.length > 0
      ? requestedVersions.every(requested => versions.includes(requested))
      : versions.includes(VERSION_NEUTRAL);
  };
}

/**
 * Returns the versions the request asks for (none when it asks for none), or
 * `null` when the custom extractor fails on it.
 */
function getRequestedVersions(
  request: Record<string, any>,
  versioningOptions: VersioningOptions,
): string[] | null {
  const headers = request.headers ?? {};
  let version: string | string[] | undefined;
  switch (versioningOptions.type) {
    case VersioningType.HEADER:
      version =
        headers[versioningOptions.header] ||
        headers[versioningOptions.header.toLowerCase()];
      break;
    case VersioningType.MEDIA_TYPE:
      version = getMediaTypeVersion(
        headers['Accept'] || headers['accept'],
        versioningOptions.key,
      );
      break;
    case VersioningType.CUSTOM:
      try {
        version = versioningOptions.extractor(request);
      } catch {
        // The router gets the same error
        return null;
      }
      break;
  }
  return isUndefined(version) ? [] : ([] as string[]).concat(version);
}

/**
 * Returns the version carried by an `Accept` header for media type versioning,
 * e.g. `2` for `application/json;v=2` with the `v=` key. A copy of the
 * function the platform packages read it with.
 */
function getMediaTypeVersion(
  acceptHeader: string | string[] | undefined,
  key: string,
): string | undefined {
  const mediaRanges = ([] as string[])
    .concat(acceptHeader ?? [])
    .flatMap(value => value.split(','));

  for (const mediaRange of mediaRanges) {
    const [, ...parameters] = mediaRange.split(';');
    for (const parameter of parameters) {
      const trimmedParameter = parameter.trim();
      if (trimmedParameter.startsWith(key)) {
        return trimmedParameter.slice(key.length);
      }
    }
  }
  return undefined;
}
