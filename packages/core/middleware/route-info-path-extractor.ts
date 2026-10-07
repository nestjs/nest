import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { ApplicationConfig } from '../application-config.js';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface.js';
import { isRouteExcluded } from '../router/utils/index.js';
import { RoutePathFactory } from './../router/route-path-factory.js';
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

  constructor(
    private readonly applicationConfig: ApplicationConfig,
    private readonly controllerRoutes?: RouteInfo[],
  ) {
    this.routePathFactory = new RoutePathFactory(applicationConfig);
    this.prefixPath = stripEndSlash(
      addLeadingSlash(this.applicationConfig.getGlobalPrefix()),
    );
    this.excludedGlobalPrefixRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude!;
    this.versioningConfig = this.applicationConfig.getVersioning();
  }

  public extractPathsFrom({ path, method, version }: RouteInfo): string[] {
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

      const controllerRoutes = this.controllerRoutes;
      if (
        controllerRoutes &&
        this.versioningConfig?.type === VersioningType.URI &&
        (!versionPaths.length || versionPaths.includes(''))
      ) {
        const excludedPaths = (this.excludedGlobalPrefixRoutes ?? []).flatMap(
          route => {
            const versionPrefixes = new Set(
              controllerRoutes
                .filter(controllerRoute =>
                  isRouteExcluded(
                    [route],
                    controllerRoute.path,
                    controllerRoute.method,
                  ),
                )
                .flatMap(({ version }) => {
                  const prefixes = this.extractVersionPathFrom(version);
                  return prefixes.length ? prefixes : [''];
                }),
            );
            // A neutral root wildcard already covers its versioned variants.
            if (
              versionPrefixes.has('') &&
              this.isAWildcard(addLeadingSlash(route.path))
            ) {
              return [addLeadingSlash(route.path)];
            }
            return [...versionPrefixes].map(
              prefix => prefix + addLeadingSlash(route.path),
            );
          },
        );
        return [...new Set([...entries, ...excludedPaths])];
      }

      return Array.isArray(this.excludedGlobalPrefixRoutes)
        ? [
            ...entries,
            ...this.excludedGlobalPrefixRoutes
              .map(route =>
                Array.isArray(versionPaths) && versionPaths.length > 0
                  ? versionPaths.map(v => v + addLeadingSlash(route.path))
                  : addLeadingSlash(route.path),
              )
              .flat(),
          ]
        : entries;
    }

    return this.extractNonWildcardPathsFrom({ path, method, version });
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
