import { VersioningType } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { isRouteExcluded } from '../router/utils';
import { RoutePathFactory } from './../router/route-path-factory';

export class RouteInfoPathExtractor {
  private routePathFactory: RoutePathFactory;

  constructor(private readonly applicationConfig: ApplicationConfig) {
    this.routePathFactory = new RoutePathFactory(applicationConfig);
  }

  public extractPathsFrom({ path, method, version }: RouteInfo) {
    const prefixPath = stripEndSlash(
      addLeadingSlash(this.applicationConfig.getGlobalPrefix()),
    );
    const excludedRoutes =
      this.applicationConfig.getGlobalPrefixOptions().exclude;

    const applicationVersioningConfig = this.applicationConfig.getVersioning();
    let versionPath = '';
    if (version && applicationVersioningConfig?.type === VersioningType.URI) {
      const versionPrefix = this.routePathFactory.getVersionPrefix(
        applicationVersioningConfig,
      );
      versionPath = addLeadingSlash(versionPrefix + version.toString());
    }

    const isAWildcard = ['*', '/*', '/*/', '(.*)', '/(.*)'].includes(path);
    if (isAWildcard) {
      return Array.isArray(excludedRoutes)
        ? [
            prefixPath + versionPath + addLeadingSlash(path),
            ...excludedRoutes.map(
              route => versionPath + addLeadingSlash(route.path),
            ),
          ]
        : [prefixPath + versionPath + addLeadingSlash(path)];
    }

    if (
      Array.isArray(excludedRoutes) &&
      isRouteExcluded(excludedRoutes, path, method)
    ) {
      return [versionPath + addLeadingSlash(path)];
    }

    return [prefixPath + versionPath + addLeadingSlash(path)];
  }
}
