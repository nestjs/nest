import { PATH_METADATA } from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces';
import { isString, isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { NestContainer } from '../injector/container';
import { MetadataScanner } from '../metadata-scanner';
import { RouterExplorer } from '../router/router-explorer';

export class RoutesMapper {
  private readonly routerExplorer: RouterExplorer;

  constructor(container: NestContainer) {
    this.routerExplorer = new RouterExplorer(new MetadataScanner(), container);
  }

  public mapRouteToRouteProps(route: Type<any> | any | string): string[] {
    if (isString(route)) {
      return [this.validateRoutePath(route)];
    }
    const routePath: string = Reflect.getMetadata(PATH_METADATA, route);
    if (isUndefined(routePath)) {
      return [this.mapObjectToPath(route)];
    }
    const paths = this.routerExplorer.scanForPaths(
      Object.create(route),
      route.prototype,
    );
    const uniquePathsSet = new Set(
      paths.map(
        item =>
          this.validateGlobalPath(routePath) +
          this.validateRoutePath(item.path),
      ),
    );
    return [...uniquePathsSet.values()];
  }

  private mapObjectToPath(routeOrPath): string {
    if (isString(routeOrPath)) {
      return this.validateRoutePath(routeOrPath);
    }
    const { path } = routeOrPath;
    if (isUndefined(path)) {
      throw new UnknownRequestMappingException();
    }
    return this.validateRoutePath(path);
  }

  private validateGlobalPath(path: string): string {
    const prefix = validatePath(path);
    return prefix === '/' ? '' : prefix;
  }

  private validateRoutePath(path: string): string {
    return validatePath(path);
  }
}
