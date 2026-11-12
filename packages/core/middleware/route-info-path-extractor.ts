import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import {
  RouteInfo,
  VersioningOptions,
  VersionValue,
} from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { pathToRegexp } from 'path-to-regexp';
import { ApplicationConfig } from '../application-config';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';
import { LegacyRouteConverter } from '../router/legacy-route-converter';
import { isRequestMethodAll, isRouteExcluded } from '../router/utils';
import { RoutePathFactory } from './../router/route-path-factory';
import { isStaticPath } from './utils';

// Named so that it does not clash with a parameter of an excluded route
const URI_VERSION_PARAM = 'nestUriVersion';

/**
 * A route of a controller, as the router serves it: on which side of the
 * global prefix, and under which version paths (`''` for none).
 */
interface ServedControllerRoute {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
  isExcludedFromPrefix: boolean;
  versionPaths: string[];
}

export class RouteInfoPathExtractor {
  private readonly routePathFactory: RoutePathFactory;
  private readonly prefixPath: string;
  private readonly excludedGlobalPrefixRoutes: ExcludeRouteMetadata[];
  private readonly versioningConfig?: VersioningOptions;
  private servedControllerRoutes?: ServedControllerRoute[];

  /**
   * @param getControllerRoutes Returns the routes of the controllers of the
   * application, so that a route passed to `forRoutes()` is also mounted on
   * the routes it covers that the router serves on the other side of the
   * global prefix (see `getPathsOfCoveredControllerRoutes()`).
   */
  constructor(
    private readonly applicationConfig: ApplicationConfig,
    private readonly getControllerRoutes?: () => RouteInfo[],
  ) {
    this.routePathFactory = new RoutePathFactory(applicationConfig);
    this.prefixPath = stripEndSlash(
      addLeadingSlash(this.applicationConfig.getGlobalPrefix()),
    );
    this.excludedGlobalPrefixRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude!;
    this.versioningConfig = this.applicationConfig.getVersioning();
  }

  public extractPathsFrom({
    path,
    method,
    version = this.getVersionOfUnversionedRoutes(),
  }: RouteInfo): string[] {
    const versionPaths = this.extractVersionPathFrom(version);

    if (this.isAWildcard(path)) {
      // VERSION_NEUTRAL has no version segment, so its wildcard already covers
      // every versioned path; registering both would run the middleware twice.
      const wildcardVersionPaths = versionPaths.includes('')
        ? []
        : versionPaths;
      const entries =
        wildcardVersionPaths.length > 0
          ? wildcardVersionPaths
              .map(versionPath => [
                this.prefixPath + versionPath + '$',
                this.prefixPath + versionPath + addLeadingSlash(path),
              ])
              .flat()
          : this.prefixPath
            ? [this.prefixPath + '$', this.prefixPath + addLeadingSlash(path)]
            : [addLeadingSlash(path)];

      if (!Array.isArray(this.excludedGlobalPrefixRoutes)) {
        return entries;
      }
      const excludedVersionPaths =
        this.getVersionPathsOfExcludedRoutes(wildcardVersionPaths);
      return [
        ...new Set([
          ...entries,
          ...this.excludedGlobalPrefixRoutes
            .flatMap(route => this.getPathsOfExcludedRoute(route))
            .flatMap(excludedPath =>
              excludedVersionPaths.map(v => v + excludedPath),
            ),
          ...this.getPathsOfCoveredControllerRoutes(
            method,
            wildcardVersionPaths,
          ),
        ]),
      ];
    }

    return this.extractNonWildcardPathsFrom({ path, method, version });
  }

  /**
   * Returns the routes of the controllers that the route passed to
   * `forRoutes()` covers, but that the router serves on the other side of
   * the global prefix than the paths the route is mounted on, with the method
   * of the route they are served for. The router decides for each route
   * whether the prefix applies, by testing the exclusions against the path
   * the route is declared with, while the route of `forRoutes()` is mounted
   * on one side only: "files/*path" excluded by "files/:name" (which matches
   * its text) is mounted without the prefix, where "files/:name/versions" is
   * served under it.
   *
   * A route covers a controller route whose declared path it matches (as a
   * plain string mounted on the sub-paths too), of a method it is mounted
   * for, under one of its versions. See `getPathsOfCoveredControllerRoutes()`
   * for a wildcard.
   */
  public extractControllerRoutesCoveredBy({
    path,
    method,
    version = this.getVersionOfUnversionedRoutes(),
  }: RouteInfo): RouteInfo[] {
    const controllerRoutes = this.getServedControllerRoutes();
    if (controllerRoutes.length === 0 || this.isAWildcard(path)) {
      return [];
    }
    let routeRegex: RegExp;
    try {
      routeRegex = pathToRegexp(
        LegacyRouteConverter.tryConvert(addLeadingSlash(path), { logs: false }),
        // A plain string is mounted on its sub-paths (Express "use()")
        { sensitive: false, end: (method as number) !== -1 },
      ).regexp;
    } catch {
      // The adapter reports a path it cannot mount
      return [];
    }
    const isMountedOutsidePrefix = isRouteExcluded(
      this.excludedGlobalPrefixRoutes,
      path,
      method,
    );
    const mountedVersionPaths = this.toMountedVersionPaths(
      this.extractVersionPathFrom(version),
    );
    return controllerRoutes.flatMap(controllerRoute => {
      if (
        controllerRoute.isExcludedFromPrefix === isMountedOutsidePrefix ||
        !isMethodCovered(method, controllerRoute.method) ||
        !controllerRoute.versionPaths.some(versionPath =>
          mountedVersionPaths.includes(versionPath),
        ) ||
        !routeRegex.test(controllerRoute.path) ||
        !isMountable(controllerRoute.path)
      ) {
        return [];
      }
      const routeInfo: RouteInfo = {
        path: controllerRoute.path,
        method: isRequestMethodAll(method) ? controllerRoute.method : method,
      };
      if (controllerRoute.version) {
        routeInfo.version = controllerRoute.version;
      }
      return [routeInfo];
    });
  }

  /**
   * Returns the paths the router serves the routes of the controllers that it
   * takes out of the global prefix at, for a wildcard of `forRoutes()`: it
   * is mounted under the prefix and on the exclusions themselves, which do
   * not cover every route they take out ("files/:id" also takes out
   * "files/*path", read as a value of ":id", which serves "/files/a/b"; a
   * mis-cased exclusion takes out the route as it is spelled). The routes of
   * other versions than the wildcard's own are left out.
   */
  private getPathsOfCoveredControllerRoutes(
    method: RequestMethod,
    wildcardVersionPaths: string[],
  ): string[] {
    return this.getServedControllerRoutes().flatMap(controllerRoute => {
      if (
        !controllerRoute.isExcludedFromPrefix ||
        !isMethodCovered(method, controllerRoute.method)
      ) {
        return [];
      }
      return controllerRoute.versionPaths
        .filter(
          versionPath =>
            wildcardVersionPaths.length === 0 ||
            wildcardVersionPaths.includes(versionPath),
        )
        .map(
          versionPath => versionPath + toMountablePath(controllerRoute.path),
        );
    });
  }

  /**
   * A route without a version is mounted without a version path.
   */
  private toMountedVersionPaths(versionPaths: string[]): string[] {
    return versionPaths.length > 0 ? versionPaths : [''];
  }

  private getServedControllerRoutes(): ServedControllerRoute[] {
    if (
      !this.getControllerRoutes ||
      !this.prefixPath ||
      !Array.isArray(this.excludedGlobalPrefixRoutes) ||
      this.excludedGlobalPrefixRoutes.length === 0
    ) {
      return [];
    }
    return (this.servedControllerRoutes ??= this.getControllerRoutes().map(
      ({ path, method, version }) => {
        return {
          path: addLeadingSlash(path),
          method,
          version,
          // As the router decides it (see `RoutePathFactory`)
          isExcludedFromPrefix: isRouteExcluded(
            this.excludedGlobalPrefixRoutes,
            path,
            method,
          ),
          versionPaths: this.toMountedVersionPaths(
            this.extractVersionPathFrom(version),
          ),
        };
      },
    ));
  }

  /**
   * Returns the routes excluded from the global prefix that the route covers
   * without being excluded itself: the router serves them without the
   * prefix, out of the reach of the paths the route is mounted on. These are
   * the excluded routes without parameters or wildcards that the route
   * matches, such as "users/me" for "users/:id" (or a `GET` exclusion for a
   * route of every method), and the root route of a controller at the
   * route's own path, which an exclusion ending in an optional segment such
   * as "reports/{*path}" takes out of the prefix (see
   * `isExcludedWithTrailingSlash()`).
   */
  public extractExcludedRoutesCoveredBy({
    path,
    method,
    version,
  }: RouteInfo): RouteInfo[] {
    if (
      !Array.isArray(this.excludedGlobalPrefixRoutes) ||
      this.isAWildcard(path) ||
      isRouteExcluded(this.excludedGlobalPrefixRoutes, path, method)
    ) {
      return [];
    }
    let routeRegex: RegExp;
    try {
      routeRegex = pathToRegexp(
        LegacyRouteConverter.tryConvert(addLeadingSlash(path), { logs: false }),
      ).regexp;
    } catch {
      // The adapter reports a path it cannot mount
      return [];
    }
    return this.excludedGlobalPrefixRoutes.flatMap(excludedRoute => {
      const excludedPath = addLeadingSlash(excludedRoute.path);
      const excludedMethod = isRequestMethodAll(excludedRoute.requestMethod)
        ? method
        : excludedRoute.requestMethod;
      if (!(isRequestMethodAll(method) || method === excludedMethod)) {
        return [];
      }
      // Mounted with the trailing slash, like the root route of a controller
      // passed to forRoutes(), so that it is not under the prefix either
      const coveredPath =
        isStaticPath(excludedPath) && routeRegex.test(excludedPath)
          ? excludedPath
          : this.isExcludedWithTrailingSlash(excludedRoute, path)
            ? stripEndSlash(addLeadingSlash(path)) + '/'
            : undefined;
      if (!coveredPath) {
        return [];
      }
      const routeInfo: RouteInfo = {
        path: coveredPath,
        method: excludedMethod,
      };
      if (version) {
        routeInfo.version = version;
      }
      return [routeInfo];
    });
  }

  /**
   * Returns the version paths to mount the routes excluded from the global
   * prefix under for a wildcard. A wildcard limited to some versions covers
   * those, while any other one covers the routes of every version under the
   * prefix, so it has to cover them out of it too. The versions controllers
   * declare are not known when middleware is registered, hence the parameter.
   */
  private getVersionPathsOfExcludedRoutes(
    wildcardVersionPaths: string[],
  ): string[] {
    if (wildcardVersionPaths.length > 0) {
      return wildcardVersionPaths;
    }
    if (this.versioningConfig?.type !== VersioningType.URI) {
      return [''];
    }
    const versionPrefix = this.routePathFactory.getVersionPrefix(
      this.versioningConfig,
    );
    return ['', addLeadingSlash(`${versionPrefix}:${URI_VERSION_PARAM}`)];
  }

  /**
   * Returns the paths the router serves a route excluded from the global
   * prefix at: those of its pattern and, for a pattern ending in an optional
   * segment such as "reports/{*path}", the parent path ("/reports") (see
   * `isExcludedWithTrailingSlash()`).
   */
  private getPathsOfExcludedRoute(route: ExcludeRouteMetadata): string[] {
    const excludedPath = addLeadingSlash(route.path);
    const parentPath = excludedPath.slice(0, excludedPath.lastIndexOf('/'));
    return this.isExcludedWithTrailingSlash(route, parentPath)
      ? [excludedPath, parentPath]
      : [excludedPath];
  }

  /**
   * Tells whether the exclusion takes a route at the path out of the global
   * prefix only through a trailing slash: the router tests the root route of
   * a controller with one ("/reports/"), which an exclusion ending in an
   * optional segment matches ("reports/{*path}"), and serves it at
   * "/reports", which the exclusion does not match.
   */
  private isExcludedWithTrailingSlash(
    { pathRegex }: ExcludeRouteMetadata,
    path: string,
  ): boolean {
    const pathWithoutSlash = stripEndSlash(addLeadingSlash(path));
    return (
      pathWithoutSlash !== '' &&
      pathRegex.test(pathWithoutSlash + '/') &&
      !pathRegex.test(pathWithoutSlash)
    );
  }

  public getVersioningOptions(): VersioningOptions | undefined {
    return this.versioningConfig;
  }

  public extractPathFrom(route: RouteInfo): string[] {
    if (this.isAWildcard(route.path) && !route.version) {
      return [addLeadingSlash(route.path)];
    }

    return this.extractNonWildcardPathsFrom(route);
  }

  private isAWildcard(path: string): boolean {
    const isSimpleWildcard = ['*', '/*', '/*/', '(.*)', '/(.*)'];
    if (isSimpleWildcard.includes(path)) {
      return true;
    }

    const wildcardRegexp = /^\/\{.*\}.*|^\/\*.*$/;
    return wildcardRegexp.test(path);
  }

  private extractNonWildcardPathsFrom({
    path,
    method,
    version,
  }: RouteInfo): string[] {
    const versionPaths = this.extractVersionPathFrom(version);

    if (
      Array.isArray(this.excludedGlobalPrefixRoutes) &&
      isRouteExcluded(this.excludedGlobalPrefixRoutes, path, method)
    ) {
      if (!versionPaths.length) {
        return [addLeadingSlash(path)];
      }

      return versionPaths.map(
        versionPath => versionPath + addLeadingSlash(path),
      );
    }

    if (!versionPaths.length) {
      return [this.prefixPath + addLeadingSlash(path)];
    }
    return versionPaths.map(
      versionPath => this.prefixPath + versionPath + addLeadingSlash(path),
    );
  }

  /**
   * Returns the versions a route given without a version (e.g.
   * `forRoutes('cats')`) may be served under: no version, as for a
   * version-neutral controller, and the default version, under which
   * controllers without a version are served.
   */
  private getVersionOfUnversionedRoutes(): VersionValue | undefined {
    if (this.versioningConfig?.type !== VersioningType.URI) {
      return;
    }
    const { defaultVersion } = this.versioningConfig;
    if (!defaultVersion) {
      return;
    }
    const versions = new Set<string | typeof VERSION_NEUTRAL>([
      VERSION_NEUTRAL,
    ]);
    if (Array.isArray(defaultVersion)) {
      defaultVersion.forEach(version => versions.add(version));
    } else {
      versions.add(defaultVersion);
    }
    return [...versions];
  }

  private extractVersionPathFrom(versionValue?: VersionValue): string[] {
    if (!versionValue || this.versioningConfig?.type !== VersioningType.URI)
      return [];

    const versionPrefix = this.routePathFactory.getVersionPrefix(
      this.versioningConfig,
    );
    const toVersionPath = (version: string | typeof VERSION_NEUTRAL) =>
      version === VERSION_NEUTRAL
        ? ''
        : addLeadingSlash(versionPrefix + version);

    if (Array.isArray(versionValue)) {
      return versionValue.map(toVersionPath);
    }
    return [toVersionPath(versionValue)];
  }
}

/**
 * Tells whether a route of `forRoutes()` mounted for a method also runs for
 * the requests of a controller route of another one.
 */
function isMethodCovered(
  mountedMethod: RequestMethod,
  routeMethod: RequestMethod,
): boolean {
  return (
    isRequestMethodAll(mountedMethod) ||
    isRequestMethodAll(routeMethod) ||
    mountedMethod === routeMethod ||
    // The middleware of a GET route runs for HEAD requests too
    (mountedMethod === RequestMethod.GET && routeMethod === RequestMethod.HEAD)
  );
}

/**
 * Returns the path to mount a middleware on for a route served at the path.
 * A path the adapters cannot mount a middleware on (syntax of the router of
 * Fastify, such as ":id?") is replaced with the paths below its leading
 * static segments.
 */
function isMountable(path: string): boolean {
  try {
    pathToRegexp(LegacyRouteConverter.tryConvert(path, { logs: false }));
    return true;
  } catch {
    return false;
  }
}

function toMountablePath(path: string): string {
  if (isMountable(path)) {
    return path;
  }
  const segments = path.split('/');
  const firstPatternSegment = segments.findIndex(
    segment => !isStaticPath(segment),
  );
  return (
    segments
      .slice(0, firstPatternSegment >= 0 ? firstPatternSegment : undefined)
      .join('/') + '{/*path}'
  );
}
