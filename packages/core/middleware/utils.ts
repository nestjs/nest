import {
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
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
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { pathToRegexp } from 'path-to-regexp';
import { uid } from 'uid';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';
import { LegacyRouteConverter } from '../router/legacy-route-converter';
import { isRequestMethodAll } from '../router/utils';

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
      const excludedRoute: ExcludeRouteMetadata = {
        path,
        requestMethod: isString(route) ? RequestMethod.ALL : route.method,
        pathRegex: compileExcludedPath(path, matchingOptions),
      };
      if (matchingOptions && servesTrailingSlashByAnyRoute(matchingOptions)) {
        excludedRoute.exactPathRegex = compileExcludedPath(path, {
          ...matchingOptions,
          ignoreTrailingSlash: false,
        });
      }
      if (!isString(route) && route.version) {
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
 * Tells whether the router serves a path ending with "/" with the first
 * route that matches it, which may be another route than the one of the path
 * without the slash: "/x/" by "x/{*path}" rather than by "x" (Express, the
 * node adapter). A router that removes the slash before it looks for a route
 * (Fastify) always serves "/x/" with the "x" route.
 */
function servesTrailingSlashByAnyRoute(
  matchingOptions: RouteMatchingOptions,
): boolean {
  return (
    matchingOptions.ignoreTrailingSlash && !matchingOptions.removesTrailingSlash
  );
}

/**
 * Compiles the routes the application serves (see
 * `MiddlewareBuilder.getServedRoutes()`) that may serve a path ending with
 * "/" in place of the route of the path without it: those with a parameter
 * or a wildcard ("x/{*path}", "x/{:id}"). A route without them serves "/x/"
 * only along with "/x".
 */
function mapToServedRoutes(
  routes: RouteInfo[],
  matchingOptions: RouteMatchingOptions,
): ExcludeRouteMetadata[] {
  return routes
    .filter(route => !isStaticPath(route.path))
    .flatMap(route => {
      const path = LegacyRouteConverter.tryConvert(route.path, { logs: false });
      try {
        const pathRegex = compileExcludedPath(path, matchingOptions);
        return [{ path, requestMethod: route.method, pathRegex }];
      } catch {
        // A path that the router reads in another way (Fastify syntax)
        return [];
      }
    });
}

/**
 * Removes the trailing slashes of a request path in linear time: the
 * `/\/+$/` regex is retried from every slash of the path, which takes
 * quadratic time on a long run of slashes that does not end it.
 */
export function stripEndSlashes(path: string): string {
  let end = path.length;
  while (end > 0 && path.charCodeAt(end - 1) === 47 /* / */) {
    end--;
  }
  return path.slice(0, end);
}

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
  getServedRoutes?: () => RouteInfo[],
) => {
  // Excluded routes must match exactly the requests the router serves with
  // them, as the middleware is skipped for every request they match. When
  // the adapter does not tell how its router matches paths, they match
  // exactly, so that a more lenient router runs the middleware for the
  // variants of an excluded path rather than skipping it
  const matchingOptions =
    httpAdapter.getRouteMatchingOptions?.() ?? EXACT_ROUTE_MATCHING;
  const excludedRoutes = mapToExcludeRoute(routes, matchingOptions);
  let servedRoutes: ExcludeRouteMetadata[] | undefined;
  const getCompiledServedRoutes =
    getServedRoutes &&
    excludedRoutes.length > 0 &&
    servesTrailingSlashByAnyRoute(matchingOptions)
      ? () =>
          (servedRoutes ??= mapToServedRoutes(
            getServedRoutes(),
            matchingOptions,
          ))
      : undefined;
  return iterate([])
    .concat(middleware)
    .filter(isFunction)
    .map((item: T) =>
      mapToClass(
        item,
        excludedRoutes,
        httpAdapter,
        matchingOptions,
        versioningOptions,
        getCompiledServedRoutes,
      ),
    )
    .toArray();
};

export const mapToClass = <T extends Function | Type<any>>(
  middleware: T,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
  matchingOptions: RouteMatchingOptions | boolean = false,
  versioningOptions?: VersioningOptions,
  getServedRoutes?: () => ExcludeRouteMetadata[],
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
          matchingOptions,
          versioningOptions,
          getServedRoutes,
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
          matchingOptions,
          versioningOptions,
          getServedRoutes,
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

/**
 * Tells whether the request is served by one of the excluded routes, so that
 * the middleware is skipped for it. `matchingOptions` tell how the router
 * matches paths (`true` and `false` stand for `ignoreTrailingSlash`), and
 * `getServedRoutes` returns the routes of the application that may serve a
 * path ending with "/" on a router that serves it with the first route that
 * matches it.
 */
export function isMiddlewareRouteExcluded(
  req: Record<string, any>,
  excludedRoutes: ExcludeRouteMetadata[],
  httpAdapter: HttpServer,
  matchingOptions: RouteMatchingOptions | boolean = false,
  versioningOptions?: VersioningOptions,
  getServedRoutes?: () => ExcludeRouteMetadata[],
): boolean {
  if (excludedRoutes.length <= 0) {
    return false;
  }
  const { ignoreTrailingSlash, removesTrailingSlash } =
    typeof matchingOptions === 'boolean'
      ? { ignoreTrailingSlash: matchingOptions, removesTrailingSlash: false }
      : matchingOptions;
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

  const requestMethod = RequestMethod[reqMethod as keyof typeof RequestMethod];
  const isRequestForRoute = (
    { requestMethod: routeMethod, pathRegex }: ExcludeRouteMetadata,
    path: string,
    regex = pathRegex,
  ) =>
    (isRequestMethodAll(routeMethod) || routeMethod === requestMethod) &&
    regex.test(addLeadingSlash(path));
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
    const pathWithoutSlash = stripEndSlashes(pathname);
    if (!isExcluded(pathname) || !isExcluded(pathWithoutSlash)) {
      return false;
    }
    // Express and the node adapter serve "/x/" with the first route that
    // matches it, which may be one that matches "/x/" itself ("x/{*path}",
    // "x/{:id}") rather than the "/x" route. When the application has such
    // a route, "/x/" is excluded only if an exclusion matches it without the
    // optional trailing slash too, as it then covers that route
    const isServedByAnotherRoute =
      !removesTrailingSlash &&
      getServedRoutes?.().some(
        route =>
          isRequestForRoute(route, pathname) &&
          !isRequestForRoute(route, pathWithoutSlash),
      );
    if (!isServedByAnotherRoute) {
      return true;
    }
    return excludedRoutes.some(
      route =>
        !!route.exactPathRegex &&
        isRequestForRoute(route, pathname, route.exactPathRegex) &&
        isVersionRequested(route),
    );
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
    case VersioningType.MEDIA_TYPE: {
      const mediaTypeVersion = getMediaTypeVersion(
        headers['Accept'] || headers['accept'],
        versioningOptions.key,
      );
      if (mediaTypeVersion === null) {
        return null;
      }
      version = mediaTypeVersion;
      break;
    }
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
 * e.g. `2` for `application/json;v=2` with the `v=` key, read as the version
 * filters of the HTTP adapters read it: `undefined` when the header has no
 * parameter, and `null` when its parameter carries no version, which no
 * versioned route is served for.
 */
function getMediaTypeVersion(
  acceptHeader: string | string[] | undefined,
  key: string,
): string | undefined | null {
  const parameter = isString(acceptHeader)
    ? acceptHeader.split(';')[1]
    : undefined;
  if (isUndefined(parameter)) {
    return undefined;
  }
  return parameter.split(key)[1] ?? null;
}
