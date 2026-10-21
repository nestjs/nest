import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { pathToRegexp } from 'path-to-regexp';
import { ApplicationConfig } from '../application-config.js';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface.js';
import { LegacyRouteConverter } from '../router/legacy-route-converter.js';
import { isRequestMethodAll, isRouteExcluded } from '../router/utils/index.js';
import { RoutePathFactory } from './../router/route-path-factory.js';
import { isStaticPath } from './utils.js';
import type { VersioningOptions } from '@nestjs/common';
import {
  type RouteInfo,
  type VersionValue,
  addLeadingSlash,
  stripEndSlash,
} from '@nestjs/common/internal';

export class RouteInfoPathExtractor {
  private readonly routePathFactory: RoutePathFactory;
  private readonly prefixPath: string;
  private readonly excludedGlobalPrefixRoutes: ExcludeRouteMetadata[];
  private readonly versioningConfig?: VersioningOptions;

  constructor(private readonly applicationConfig: ApplicationConfig) {
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

      return Array.isArray(this.excludedGlobalPrefixRoutes)
        ? [
            ...entries,
            ...this.excludedGlobalPrefixRoutes
              .flatMap(route => this.getPathsOfExcludedRoute(route))
              .flatMap(excludedPath =>
                versionPaths.length > 0
                  ? versionPaths.map(v => v + excludedPath)
                  : [excludedPath],
              ),
          ]
        : entries;
    }

    return this.extractNonWildcardPathsFrom({ path, method, version });
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
   *
   * The route matches case-insensitively unless `caseSensitive` is set: a
   * caller that skips something for the covered routes (an exclusion) must
   * match them as strictly as the router does.
   */
  public extractExcludedRoutesCoveredBy(
    { path, method, version }: RouteInfo,
    { caseSensitive = false }: { caseSensitive?: boolean } = {},
  ): RouteInfo[] {
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
        { sensitive: caseSensitive },
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
   * Returns the routes that an exclusion (`MiddlewareConsumer.exclude()`, or
   * the `exclude` option of the CSRF protection) skips, with the paths they
   * are served at: the route itself and the routes excluded from the global
   * prefix that it covers, which the router serves without the prefix (see
   * `extractExcludedRoutesCoveredBy()`). Exclusions match case-sensitively
   * unless told otherwise, as matching too much skips the middleware.
   */
  public extractExclusionsFrom(
    route: RouteInfo,
    { caseSensitive = true }: { caseSensitive?: boolean } = {},
  ): RouteInfo[] {
    return [
      route,
      ...this.extractExcludedRoutesCoveredBy(route, { caseSensitive }),
    ].flatMap(excludedRoute =>
      this.extractPathFrom(excludedRoute).map(path => ({
        ...excludedRoute,
        path,
      })),
    );
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
