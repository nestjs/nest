import 'reflect-metadata';
import { RouterExplorer } from '../router/router-explorer';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { isUndefined, validatePath, isString } from '@nestjs/common/utils/shared.utils';
import { PATH_METADATA } from '@nestjs/common/constants';
import { MetadataScanner } from '../metadata-scanner';
import { NestContainer } from '../injector/container';

export class RoutesMapper {
  private readonly routerExplorer: RouterExplorer;

  constructor(container: NestContainer) {
    this.routerExplorer = new RouterExplorer(new MetadataScanner(), container);
  }

  public mapRouteToRouteProps(routeMetatype): string[] {
    const routePath: string = Reflect.getMetadata(PATH_METADATA, routeMetatype);
    if (isUndefined(routePath)) {
      return [this.mapObjectToPath(routeMetatype)];
    }
    const paths = this.routerExplorer.scanForPaths(
      Object.create(routeMetatype),
      routeMetatype.prototype,
    );
    const uniquePathsSet = new Set(paths.map(route => (
      this.validateGlobalPath(routePath) + this.validateRoutePath(route.path)
    )));
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
