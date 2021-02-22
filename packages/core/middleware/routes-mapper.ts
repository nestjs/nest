import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { RouteInfo, Type } from '@nestjs/common/interfaces';
import {
  addLeadingSlash,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { NestContainer } from '../injector/container';
import { MetadataScanner } from '../metadata-scanner';
import { RouterExplorer } from '../router/router-explorer';

export class RoutesMapper {
  private readonly routerExplorer: RouterExplorer;

  constructor(container: NestContainer) {
    this.routerExplorer = new RouterExplorer(new MetadataScanner(), container);
  }

  public mapRouteToRouteInfo(
    route: Type<any> | RouteInfo | string,
  ): RouteInfo[] {
    if (isString(route)) {
      return [
        {
          path: this.validateRoutePath(route),
          method: RequestMethod.ALL,
        },
      ];
    }
    const routePathOrPaths: string | string[] = Reflect.getMetadata(
      PATH_METADATA,
      route,
    );
    if (this.isRouteInfo(routePathOrPaths, route)) {
      return [
        {
          path: this.validateRoutePath(route.path),
          method: route.method,
        },
      ];
    }
    const paths = this.routerExplorer.scanForPaths(
      Object.create(route),
      route.prototype,
    );
    const concatPaths = <T>(acc: T[], currentValue: T[]) =>
      acc.concat(currentValue);

    return []
      .concat(routePathOrPaths)
      .map(routePath =>
        paths
          .map(
            item =>
              item.path &&
              item.path.map(p => ({
                path:
                  this.validateGlobalPath(routePath) +
                  this.validateRoutePath(p),
                method: item.requestMethod,
              })),
          )
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

  private validateGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path);
    return prefix === '/' ? '' : prefix;
  }

  private validateRoutePath(path: string): string {
    return addLeadingSlash(path);
  }
}
