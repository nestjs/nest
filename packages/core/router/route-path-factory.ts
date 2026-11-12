import {
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
  flatten,
} from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface';
import { isRouteExcluded } from './utils';

export class RoutePathFactory {
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
        : [versionOrVersions];
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

    if (
      versionOrVersions &&
      versionOrVersions !== VERSION_NEUTRAL &&
      versioningOptions?.type === VersioningType.URI
    ) {
      path = this.truncateVersionPrefixFromPath(
        path,
        versionOrVersions,
        versioningOptions,
      );
    }
    return (
      Array.isArray(excludedRoutes) &&
      isRouteExcluded(excludedRoutes, path, requestMethod)
    );
  }

  private truncateVersionPrefixFromPath(
    path: string,
    versionValue: Exclude<VersionValue, typeof VERSION_NEUTRAL>,
    versioningOptions: VersioningOptions,
  ) {
    if (typeof versionValue !== 'string') {
      versionValue.forEach(version => {
        if (typeof version === 'string') {
          path = this.truncateVersionPrefixFromPath(
            path,
            version,
            versioningOptions,
          );
        }
      });
      return path;
    }

    const prefix = `/${this.getVersionPrefix(
      versioningOptions,
    )}${versionValue}`;

    return path.startsWith(prefix) ? path.replace(prefix, '') : path;
  }
}
