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
  private routePathFactory: RoutePathFactory;
  private readonly prefixPath: string;
  private readonly excludedGlobalPrefixRoutes: ExcludeRouteMetadata[];
  private readonly versioningConfig?: VersioningOptions;

  constructor(private readonly applicationConfig: ApplicationConfig) {
    this.routePathFactory = new RoutePathFactory(applicationConfig);
    this.prefixPath = stripEndSlash(
      addLeadingSlash(this.applicationConfig.getGlobalPrefix()),
    );
    this.excludedGlobalPrefixRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude;
    this.versioningConfig = this.applicationConfig.getVersioning();
  }

  public extractPathsFrom({ path, method, version }: RouteInfo): string[] {
    const versionPath = this.extractVersionPathFrom(version);

    if (this.isAWildcard(path)) {
      return Array.isArray(this.excludedGlobalPrefixRoutes)
        ? [
            this.prefixPath + versionPath + addLeadingSlash(path),
            ...this.excludedGlobalPrefixRoutes.map(
              route => versionPath + addLeadingSlash(route.path),
            ),
          ]
        : [this.prefixPath + versionPath + addLeadingSlash(path)];
    }

    return [this.extractNonWildcardPathFrom({ path, method, version })];
  }

  public extractPathFrom(route: RouteInfo): string {
    if (this.isAWildcard(route.path) && !route.version) {
      return addLeadingSlash(route.path);
    }

    return this.extractNonWildcardPathFrom(route);
  }

  private isAWildcard(path: string): boolean {
    return ['*', '/*', '/*/', '(.*)', '/(.*)'].includes(path);
  }

  private extractNonWildcardPathFrom({
    path,
    method,
    version,
  }: RouteInfo): string {
    const versionPath = this.extractVersionPathFrom(version);

    if (
      Array.isArray(this.excludedGlobalPrefixRoutes) &&
      isRouteExcluded(this.excludedGlobalPrefixRoutes, path, method)
    ) {
      return versionPath + addLeadingSlash(path);
    }

    return this.prefixPath + versionPath + addLeadingSlash(path);
  }

  private extractVersionPathFrom(version?: VersionValue): string {
    if (!version || this.versioningConfig?.type !== VersioningType.URI)
      return '';

    const versionPrefix = this.routePathFactory.getVersionPrefix(
      this.versioningConfig,
    );
    return addLeadingSlash(versionPrefix + version.toString());
  }
}
