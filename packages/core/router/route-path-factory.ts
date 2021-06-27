import {
  flatten,
  RequestMethod,
  VersioningOptions,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  addLeadingSlash,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface';

export class RoutePathFactory {
  constructor(private readonly applicationConfig: ApplicationConfig) {}

  public create(
    metadata: RoutePathMetadata,
    requestMethod?: RequestMethod,
  ): string[] {
    let paths = [''];

    const version = this.getVersion(metadata);
    if (version && metadata.versioningOptions?.type === VersioningType.URI) {
      const versionPrefix = this.getVersionPrefix(metadata.versioningOptions);

      // Version Neutral - Do not include version in URL
      if (version !== VERSION_NEUTRAL) {
        if (Array.isArray(version)) {
          paths = flatten(
            paths.map(path => version.map(v => path + `/${versionPrefix}${v}`)),
          );
        } else {
          paths = paths.map(path => path + `/${versionPrefix}${version}`);
        }
      }
    }

    paths = this.appendToAllIfDefined(paths, metadata.modulePath);
    paths = this.appendToAllIfDefined(paths, metadata.ctrlPath);
    paths = this.appendToAllIfDefined(paths, metadata.methodPath);

    if (metadata.globalPrefix) {
      paths = paths.map(path => {
        if (this.isExcludedFromGlobalPrefix(path, requestMethod)) {
          return path;
        }
        return stripEndSlash(metadata.globalPrefix || '') + path;
      });
    }

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
  ) {
    if (isUndefined(requestMethod)) {
      return false;
    }
    const options = this.applicationConfig.getGlobalPrefixOptions();
    if (!options.exclude) {
      return false;
    }
    return options.exclude.some(route => {
      if (!route.pathRegex.exec(path)) {
        return false;
      }
      return (
        route.requestMethod === RequestMethod.ALL ||
        route.requestMethod === requestMethod
      );
    });
  }
}
