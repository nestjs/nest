import {
  type RequestMethod,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
  flatten,
} from '@nestjs/common';
import { ApplicationConfig } from '../application-config.js';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface.js';
import { isRouteExcluded } from './utils/index.js';
import {
  type VersionValue,
  addLeadingSlash,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/internal';

export class RoutePathFactory {
  constructor(private readonly applicationConfig: ApplicationConfig) {}

  /**
   * Composes route paths and reports the paths that omit a global prefix.
   * The callback receives the normalized path and its index in the result,
   * so variants that resolve to the same string retain their own decision.
   */
  public create(
    metadata: RoutePathMetadata,
    requestMethod?: RequestMethod,
    onExcludedPath?: (path: string, index: number) => void,
  ): string[] {
    let paths = [''];
    const normalizePath = (path: string) => {
      path = addLeadingSlash(path || '/');
      return path !== '/' ? stripEndSlash(path) : path;
    };

    const versionOrVersions = this.getVersion(metadata);
    if (
      versionOrVersions &&
      metadata.versioningOptions?.type === VersioningType.URI
    ) {
      const versionPrefix = this.getVersionPrefix(metadata.versioningOptions);

      if (Array.isArray(versionOrVersions)) {
        paths = flatten(
          paths.map(path =>
            versionOrVersions.map(version =>
              // Version Neutral - Do not include version in URL
              version === VERSION_NEUTRAL
                ? path
                : `${path}/${versionPrefix}${version}`,
            ),
          ),
        );
      } else {
        // Version Neutral - Do not include version in URL
        if (versionOrVersions !== VERSION_NEUTRAL) {
          paths = paths.map(
            path => `${path}/${versionPrefix}${versionOrVersions}`,
          );
        }
      }
    }

    paths = this.appendToAllIfDefined(paths, metadata.modulePath);
    paths = this.appendToAllIfDefined(paths, metadata.ctrlPath);
    paths = this.appendToAllIfDefined(paths, metadata.methodPath);

    if (metadata.globalPrefix) {
      const globalPrefix = stripEndSlash(metadata.globalPrefix);
      paths = paths.map((path, index) => {
        if (
          this.isExcludedFromGlobalPrefix(
            path,
            requestMethod,
            versionOrVersions,
            metadata.versioningOptions,
          )
        ) {
          if (globalPrefix) {
            onExcludedPath?.(normalizePath(path), index);
          }
          return path;
        }
        return globalPrefix + path;
      });
    }

    return paths.map(normalizePath);
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

    return path === prefix || path.startsWith(`${prefix}/`)
      ? path.replace(prefix, '')
      : path;
  }
}
