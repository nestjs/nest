import {
  type RequestMethod,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
  flatten,
} from '@nestjs/common';
import { ApplicationConfig } from '../application-config.js';
import { ExcludeRouteMetadata } from './interfaces/exclude-route-metadata.interface.js';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface.js';
import { isRouteExcluded } from './utils/index.js';
import {
  type RouteInfo,
  type VersionValue,
  addLeadingSlash,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/internal';

export class RoutePathFactory {
  /**
   * URI version prefixes (`/v1`, or `''` for an unversioned route) under
   * which each global prefix exclusion was matched by a created route.
   */
  private readonly excludedRouteVersionPrefixes = new Map<
    ExcludeRouteMetadata,
    Set<string>
  >();

  constructor(private readonly applicationConfig: ApplicationConfig) {}

  public create(
    metadata: RoutePathMetadata,
    requestMethod?: RequestMethod,
  ): string[] {
    // Each path is built and tested against the global prefix exclusions with
    // the one version it is built for: the version-neutral path of a
    // [VERSION_NEUTRAL, '1'] route has no "/v1" to strip, even when its own
    // path starts with "v1"
    const versionOrVersions = this.getVersion(metadata);
    let versionedPaths: { path: string; version?: VersionValue }[] = [
      { path: '' },
    ];
    if (
      versionOrVersions &&
      metadata.versioningOptions?.type === VersioningType.URI
    ) {
      const versionPrefix = this.getVersionPrefix(metadata.versioningOptions);
      const versions: Array<string | typeof VERSION_NEUTRAL> = Array.isArray(
        versionOrVersions,
      )
        ? versionOrVersions
        : [versionOrVersions as string | typeof VERSION_NEUTRAL];
      versionedPaths = versions.map(version => ({
        // Version Neutral - Do not include version in URL
        path:
          version === VERSION_NEUTRAL
            ? ''
            : `/${versionPrefix}${String(version)}`,
        version,
      }));
    }

    const paths = versionedPaths.flatMap(({ path, version }) => {
      let pathsOfVersion = this.appendToAllIfDefined(
        [path],
        metadata.modulePath,
      );
      pathsOfVersion = this.appendToAllIfDefined(
        pathsOfVersion,
        metadata.ctrlPath,
      );
      pathsOfVersion = this.appendToAllIfDefined(
        pathsOfVersion,
        metadata.methodPath,
      );
      if (!metadata.globalPrefix) {
        return pathsOfVersion;
      }
      return pathsOfVersion.map(path => {
        if (
          this.isExcludedFromGlobalPrefix(
            path,
            requestMethod,
            version,
            metadata.versioningOptions,
          )
        ) {
          this.trackExcludedRoute(
            path,
            requestMethod!,
            version,
            metadata.versioningOptions,
          );
          return path;
        }
        return stripEndSlash(metadata.globalPrefix || '') + path;
      });
    });

    return paths
      .map(path => addLeadingSlash(path || '/'))
      .map(path => (path !== '/' ? stripEndSlash(path) : path));
  }

  public getVersion(metadata: RoutePathMetadata) {
    // The version will be either the path version or the controller version,
    // with the pathVersion taking priority.
    return metadata.methodVersion || metadata.controllerVersion;
  }

  public getVersionPrefix(versioningOptions: VersioningOptions): string {
    const defaultPrefix = 'v';
    if (versioningOptions.type === VersioningType.URI) {
      if (versioningOptions.prefix === false) {
        return '';
      } else if (versioningOptions.prefix !== undefined) {
        return versioningOptions.prefix;
      }
    }
    return defaultPrefix;
  }

  public appendToAllIfDefined(
    paths: string[],
    fragmentToAppend: string | string[] | undefined,
  ): string[] {
    if (!fragmentToAppend) {
      return paths;
    }
    const concatPaths = (a: string, b: string) =>
      stripEndSlash(a) + addLeadingSlash(b);

    if (Array.isArray(fragmentToAppend)) {
      const paths2dArray = paths.map(path =>
        fragmentToAppend.map(fragment => concatPaths(path, fragment)),
      );
      return flatten(paths2dArray);
    }
    return paths.map(path => concatPaths(path, fragmentToAppend));
  }

  public isExcludedFromGlobalPrefix(
    path: string,
    requestMethod?: RequestMethod,
    versionOrVersions?: VersionValue,
    versioningOptions?: VersioningOptions,
  ) {
    if (isUndefined(requestMethod)) {
      return false;
    }
    const options = this.applicationConfig.getGlobalPrefixOptions();
    const excludedRoutes = options.exclude;

    const versionPrefix = this.getUriVersionPrefixOfPath(
      path,
      versionOrVersions,
      versioningOptions,
    );
    return (
      Array.isArray(excludedRoutes) &&
      isRouteExcluded(
        excludedRoutes,
        path.slice(versionPrefix.length),
        requestMethod,
      )
    );
  }

  /**
   * Returns the global prefix exclusions as the paths routes are actually
   * served at. Under URI versioning an exclusion such as `hello` matches the
   * unversioned path, while the route lives at `/v1/hello`, so every version
   * prefix a matching route was created under is prepended. An exclusion no
   * created route matched (e.g. a raw route registered by a library) is kept
   * as configured.
   */
  public getExcludedRoutePaths(): RouteInfo[] {
    const excludedRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude ?? [];
    return excludedRoutes.flatMap(route => {
      const versionPrefixes = this.excludedRouteVersionPrefixes.get(route) ?? [
        '',
      ];
      return [...versionPrefixes].map(versionPrefix => ({
        path: versionPrefix
          ? versionPrefix + addLeadingSlash(route.path)
          : route.path,
        method: route.requestMethod,
      }));
    });
  }

  private trackExcludedRoute(
    path: string,
    requestMethod: RequestMethod,
    versionOrVersions?: VersionValue,
    versioningOptions?: VersioningOptions,
  ) {
    // `RouterExplorer` creates each path a second time with
    // `versioningOptions: undefined` only to log it; tracking that call
    // would record `hello` next to `/v1/hello`.
    if (!versioningOptions && this.applicationConfig.getVersioning()) {
      return;
    }
    const versionPrefix = this.getUriVersionPrefixOfPath(
      path,
      versionOrVersions,
      versioningOptions,
    );
    const unversionedPath = path.slice(versionPrefix.length);
    const excludedRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude ?? [];

    excludedRoutes
      .filter(route => isRouteExcluded([route], unversionedPath, requestMethod))
      .forEach(route => {
        const versionPrefixes =
          this.excludedRouteVersionPrefixes.get(route) ?? new Set<string>();
        versionPrefixes.add(versionPrefix);
        this.excludedRouteVersionPrefixes.set(route, versionPrefixes);
      });
  }

  private getUriVersionPrefixOfPath(
    path: string,
    versionOrVersions?: VersionValue,
    versioningOptions?: VersioningOptions,
  ): string {
    if (
      !versionOrVersions ||
      versionOrVersions === VERSION_NEUTRAL ||
      versioningOptions?.type !== VersioningType.URI
    ) {
      return '';
    }
    const versions = Array.isArray(versionOrVersions)
      ? versionOrVersions
      : [versionOrVersions];
    const versionPrefix = this.getVersionPrefix(versioningOptions);

    for (const version of versions) {
      if (typeof version !== 'string') {
        continue;
      }
      const prefix = `/${versionPrefix}${version}`;
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        return prefix;
      }
    }
    return '';
  }
}
