import { VersioningType } from '@nestjs/common';
import {
  RouteInfo,
  VersioningOptions,
  VersionValue,
} from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';
import { isRouteExcluded } from '../router/utils';
import { RoutePathFactory } from './../router/route-path-factory';

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

  public extractPathsFrom({ path, method, version }: RouteInfo): string[] {
    const versionPaths = this.extractVersionPathFrom(version);

    if (this.isAWildcard(path)) {
      const entries =
        versionPaths.length > 0
          ? versionPaths
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

    if (Array.isArray(versionValue)) {
      return versionValue.map(version =>
        addLeadingSlash(versionPrefix + version.toString()),
      );
    }
    return [addLeadingSlash(versionPrefix + versionValue.toString())];
  }
}
