import {
  MODULE_PATH,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouteInfo, Type, VersionValue } from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isFunction,
  isObject,
  isString,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/utils/shared.utils';
import { inspect } from 'util';
import { ApplicationConfig } from '../application-config';
import { InvalidMiddlewareConfigurationException } from '../errors/exceptions/invalid-middleware-configuration.exception';
import { NestContainer } from '../injector/container';
import { Module } from '../injector/module';
import { MetadataScanner } from '../metadata-scanner';
import { PathsExplorer, RouteDefinition } from '../router/paths-explorer';
import { isRequestMethodAll } from '../router/utils';

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
    if (isUndefined(routePathOrPaths)) {
      // Neither a controller nor a { path, method } object (e.g. a class
      // without @Controller()): the middleware would be bound to a route no
      // request matches, without a word
      throw new InvalidMiddlewareConfigurationException(
        isFunction(controllerOrRoute)
          ? `"${controllerOrRoute.name}" passed to forRoutes() or exclude() is not a controller (is the @Controller() decorator missing?).`
          : `${inspect(controllerOrRoute, { depth: 2 })} passed to forRoutes() or exclude() is not a { path, method } object where method is a RequestMethod.`,
      );
    }

    return this.getRouteInfoFromController(controllerOrRoute, routePathOrPaths);
  }

  /**
   * Returns the routes of every controller of the application, as
   * `forRoutes()` maps a controller.
   */
  public mapControllersToRouteInfo(): RouteInfo[] {
    const controllers = new Set<Type<any>>();
    for (const moduleRef of this.container.getModules().values()) {
      for (const { metatype } of moduleRef.controllers.values()) {
        if (metatype) {
          controllers.add(metatype as Type<any>);
        }
      }
    }
    return [...controllers].flatMap(controller =>
      this.mapRouteToRouteInfo(controller),
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
          modulePath + this.normalizeGlobalPath(prefix) + addLeadingSlash(p);

        const routeInfo: RouteInfo = {
          path: endpointPath,
          method: item.requestMethod,
        };
        // A VERSION_NEUTRAL route is kept apart from a route without a
        // version, which is also served under the default version
        const version = item.version ?? controllerVersion;
        if (version && versioningConfig) {
          if (typeof version !== 'string' && Array.isArray(version)) {
            return version.map(
              (v): RouteInfo => ({
                ...routeInfo,
                version: v,
              }),
            );
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
    if (!isUndefined(path) || !isObject(objectOrClass)) {
      return false;
    }
    const { path: routePath, method } = objectOrClass as RouteInfo;
    return (
      isString(routePath) &&
      typeof method === 'number' &&
      // -1 is the "every method" of a route passed as a plain string
      (!isUndefined(RequestMethod[method]) || isRequestMethodAll(method))
    );
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
