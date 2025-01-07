import {
  MODULE_PATH,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import {
  RouteInfo,
  Type,
  VERSION_NEUTRAL,
  VersionValue,
} from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { NestContainer } from '../injector/container';
import { Module } from '../injector/module';
import { MetadataScanner } from '../metadata-scanner';
import { PathsExplorer, RouteDefinition } from '../router/paths-explorer';
import { targetModulesByContainer } from '../router/router-module';

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
    const moduleRef = this.getHostModuleOfController(controller);
    const modulePath = this.getModulePath(moduleRef?.metatype);

    const concatPaths = <T>(acc: T[], currentValue: T[]) =>
      acc.concat(currentValue);

    const toUndefinedIfNeural = (version: VersionValue) =>
      version === VERSION_NEUTRAL ? undefined : version;

    const toRouteInfo = (item: RouteDefinition, prefix: string) =>
      item.path?.flatMap(p => {
        let endpointPath = modulePath ?? '';
        endpointPath += this.normalizeGlobalPath(prefix) + addLeadingSlash(p);

        const routeInfo: RouteInfo = {
          path: endpointPath,
          method: item.requestMethod,
        };
        const version = item.version ?? controllerVersion;
        if (version && versioningConfig) {
          if (typeof version !== 'string' && Array.isArray(version)) {
            return version.map(v => ({
              ...routeInfo,
              version: toUndefinedIfNeural(v),
            }));
          }
          routeInfo.version = toUndefinedIfNeural(version);
        }

        return routeInfo;
      });

    return ([] as string[])
      .concat(routePath)
      .map(routePath =>
        controllerPaths
          .map(item => toRouteInfo(item, routePath))
          .reduce(concatPaths, []),
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

  private getHostModuleOfController(
    metatype: Type<unknown>,
  ): Module | undefined {
    if (!metatype) {
      return;
    }
    const modulesContainer = this.container.getModules();
    const moduleRefsSet = targetModulesByContainer.get(modulesContainer);
    if (!moduleRefsSet) {
      return;
    }

    const modules = Array.from(modulesContainer.values()).filter(moduleRef =>
      moduleRefsSet.has(moduleRef),
    );
    return modules.find(({ controllers }) => controllers.has(metatype));
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
