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
      this.applicationConfig.getGlobalPrefixOptions().exclude;
    this.versioningConfig = this.applicationConfig.getVersioning();
  }

  public extractPathsFrom({ path, method, version }: RouteInfo): string[] {
    if (!this.isAWildcard(path)) {
      return this.extractNonWildcardPathsFrom({ path, method, version });
    }

    const versionPaths = this.extractVersionPathFrom(version);
    const prefixes = this.combinePaths(this.prefixPath, versionPaths);
    const entries = [
      ...prefixes.filter(Boolean).map(prefix => prefix + '$'),
      ...this.combinePaths(prefixes, addLeadingSlash(path)),
    ];

    if (
      Array.isArray(this.excludedGlobalPrefixRoutes) &&
      this.excludedGlobalPrefixRoutes.length
    ) {
      const excludedGlobalPrefixPaths = this.excludedGlobalPrefixRoutes
        .map(route =>
          this.combinePaths(versionPaths, addLeadingSlash(route.path + '$')),
        )
        .flat();
      entries.push(...excludedGlobalPrefixPaths);
    }

    return entries;
  }

  public extractPathFrom(route: RouteInfo): string[] {
    if (this.isAWildcard(route.path) && !route.version) {
      return [addLeadingSlash(route.path)];
    }

    return this.extractNonWildcardPathsFrom(route);
  }

  private isAWildcard(path: string): boolean {
    return ['*', '/*', '/*/', '(.*)', '/(.*)'].includes(path);
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

  public combinePaths(a: string | string[], b: string | string[]): string[] {
    const formatter = (path: string | string[]) => {
      return Array.isArray(path) ? (path.length > 0 ? path : ['']) : [path];
    };

    const aArr = formatter(a);
    const bArr = formatter(b);
    return aArr.map(a => bArr.map(b => a + b)).flat();
  }
}
