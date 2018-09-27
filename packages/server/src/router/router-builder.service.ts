import { Injectable, Injector, Type, Utils } from '@nest/core';

import { RouterMethodFactory } from './router-method-factory.service';
import { UnknownRequestMappingException } from '../errors';
import { MetadataStorage } from '../metadata-storage';
import { RoutePathProperties } from '../interfaces';
import { ROUTE_MAPPED_MESSAGE } from '../helpers';
import { RequestMethod } from '../enums';

@Injectable()
export class RouterBuilder {
  constructor(
    private readonly routerMethodFactory: RouterMethodFactory,
    private readonly injector: Injector,
  ) {}

  private validatePath(path: string) {
    return path.charAt(0) !== '/' ? '/' + path : path;
  }

  public explore(controller: Type<any>, basePath: string) {
    const routePaths = this.scanForPaths(controller);
    this.applyPathsToRouterProxy(controller, routePaths, basePath);
  }

  private applyPathsToRouterProxy(
    controller: Type<any>,
    routePaths: RoutePathProperties[],
    basePath: string,
  ) {
    routePaths.forEach(pathProperties => {
      const { path, requestMethod } = pathProperties;
      this.applyCallbackToRouter(controller, pathProperties, basePath);
      console.log(ROUTE_MAPPED_MESSAGE(path, requestMethod));
    });
  }

  private stripSlash(str: string) {
    return str[str.length - 1] === '/' ? str.slice(0, str.length - 1) : str;
  }

  private applyCallbackToRouter(
    controller: Type<any>,
    { path, requestMethod, targetCallback, methodName }: RoutePathProperties,
    basePath: string,
  ) {
    const routerMethod = this.routerMethodFactory.get(requestMethod);
    const fullPath = this.stripSlash(basePath) + path;

    routerMethod(this.stripSlash(fullPath) || '/', targetCallback);
  }

  public validateRoutePath(path: string) {
    if (Utils.isNil(path)) {
      throw new UnknownRequestMappingException();
    }

    return this.validatePath(path);
  }

  public scanForPaths(metatype: Type<any>): RoutePathProperties[] {
    const controller = this.injector.get(metatype);
    const paths = MetadataStorage.getRequestMapping(metatype);

    return paths.map(({ methodName, path, requestMethod }) =>
      this.createRoutePathProps(controller, methodName, path, requestMethod),
    );
  }

  private createRoutePathProps(
    controller: Type<any>,
    methodName: string,
    path: string,
    requestMethod: keyof RequestMethod,
  ): RoutePathProperties {
    const targetCallback = controller[methodName];

    return {
      path: this.validateRoutePath(path),
      requestMethod,
      targetCallback,
      methodName,
    };
  }

  public exploreMethodMetadata(metatype: Type<any>, methodName: string) {
    const controller = this.injector.get(metatype);

    const { path, requestMethod } = MetadataStorage.getRequestMapping(
      metatype,
      methodName,
    );

    return this.createRoutePathProps(
      controller,
      methodName,
      path,
      requestMethod,
    );
  }

  public extractRouterPath(target: Type<any>, prefix?: string) {
    let { path } = MetadataStorage.getController(target);
    if (prefix) path = prefix + this.validateRoutePath(path);
    return this.validateRoutePath(path);
  }
}
