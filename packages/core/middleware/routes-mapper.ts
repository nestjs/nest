import { ApplicationConfig } from '../application-config.js';
import { NestContainer } from '../injector/container.js';
import { Module } from '../injector/module.js';
import { MetadataScanner } from '../metadata-scanner.js';
import { PathsExplorer, RouteDefinition } from '../router/paths-explorer.js';
import {
  MODULE_PATH,
  PATH_METADATA,
  VERSION_METADATA,
  type RouteInfo,
  type VersionValue,
  addLeadingSlash,
  isString,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/internal';
import type { Type } from '@nestjs/common';

export class RoutesMapper {
  private readonly pathsExplorer: PathsExplorer;

  constructor(
    private readonly container: NestContainer,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    this.pathsExplorer = new PathsExplorer(new MetadataScanner());
  }

  public mapRouteToRouteInfo(
    controllerOrRoute: Type<any> | RouteInfo | string,
  ): RouteInfo[] {
    if (isString(controllerOrRoute)) {
      return this.getRouteInfoFromPath(controllerOrRoute);
    }
    const routePathOrPaths = this.getRoutePath(controllerOrRoute);
    if (this.isRouteInfo(routePathOrPaths, controllerOrRoute)) {
      return this.getRouteInfoFromObject(controllerOrRoute);
    }

    return this.getRouteInfoFromController(
      controllerOrRoute,
      routePathOrPaths!,
    );
  }

  private getRouteInfoFromPath(routePath: string): RouteInfo[] {
    const defaultRequestMethod = -1;
    return [
      {
        path: addLeadingSlash(routePath),
        method: defaultRequestMethod as any,
      },
    ];
  }

  private getRouteInfoFromObject(routeInfoObject: RouteInfo): RouteInfo[] {
    const routeInfo: RouteInfo = {
      path: addLeadingSlash(routeInfoObject.path),
      method: routeInfoObject.method,
    };

    if (routeInfoObject.version) {
      routeInfo.version = routeInfoObject.version;
    }
    return [routeInfo];
  }

  private getRouteInfoFromController(
    controller: Type<any>,
    routePath: string,
  ): RouteInfo[] {
    const controllerPaths = this.pathsExplorer.scanForPaths(
      Object.create(controller),
      controller.prototype,
    );
    const controllerVersion = this.getVersionMetadata(controller);
    const versioningConfig = this.applicationConfig.getVersioning();
    const modulePaths = this.getModulePathsOfController(controller);

    const concatPaths = <T>(acc: T[], currentValue: T[]) =>
      acc.concat(currentValue);

    const toRouteInfo = (
      item: RouteDefinition,
      prefix: string,
      modulePath: string,
    ) =>
      item.path?.flatMap(p => {
        const endpointPath =
          modulePath +
          stripEndSlash(this.normalizeGlobalPath(prefix)) +
          addLeadingSlash(p);

        const routeInfo: RouteInfo = {
          path: endpointPath,
          method: item.requestMethod,
        };
        // A VERSION_NEUTRAL route is kept apart from a route without a
        // version, which is also served under the default version
        const version = item.version ?? controllerVersion;
        if (version && versioningConfig) {
          if (typeof version !== 'string' && Array.isArray(version)) {
            return version.map((v): RouteInfo => ({
              ...routeInfo,
              version: v,
            }));
          }
          routeInfo.version = version;
        }

        return routeInfo;
      });

    return ([] as string[])
      .concat(routePath)
      .flatMap(routePath =>
        modulePaths.map(modulePath =>
          controllerPaths
            .map(item => toRouteInfo(item, routePath, modulePath))
            .reduce(concatPaths, []),
        ),
      )
      .reduce(concatPaths, []);
  }

  private isRouteInfo(
    path: string | string[] | undefined,
    objectOrClass: Function | RouteInfo,
  ): objectOrClass is RouteInfo {
    return isUndefined(path);
  }

  private normalizeGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path);
    return prefix === '/' ? '' : prefix;
  }

  private getRoutePath(route: Type<any> | RouteInfo): string | undefined {
    return Reflect.getMetadata(PATH_METADATA, route);
  }

  /**
   * Returns the paths the controller is served under: the router registers it
   * once for each module that declares it, under the path of that module.
   */
  private getModulePathsOfController(metatype: Type<unknown>): string[] {
    const modulePaths = this.getHostModulesOfController(metatype).map(
      moduleRef => stripEndSlash(this.getModulePath(moduleRef.metatype) ?? ''),
    );
    return modulePaths.length > 0 ? [...new Set(modulePaths)] : [''];
  }

  private getHostModulesOfController(metatype: Type<unknown>): Module[] {
    if (!metatype) {
      return [];
    }
    const modulesContainer = this.container.getModules();
    return Array.from(modulesContainer.values()).filter(({ controllers }) =>
      controllers.has(metatype),
    );
  }

  private getModulePath(
    metatype: Type<unknown> | undefined,
  ): string | undefined {
    if (!metatype) {
      return;
    }
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metatype,
    );
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }

  private getVersionMetadata(
    metatype: Type<unknown> | Function,
  ): VersionValue | undefined {
    const versioningConfig = this.applicationConfig.getVersioning();
    if (versioningConfig) {
      return (
        Reflect.getMetadata(VERSION_METADATA, metatype) ??
        versioningConfig.defaultVersion
      );
    }
  }
}
