import 'reflect-metadata';
import { NestContainer } from '../injector/container';
import { Type } from '@nestjs/common/interfaces';
export declare class RoutesMapper {
  private readonly routerExplorer;
  constructor(container: NestContainer);
  mapRouteToRouteProps(route: Type<any> | any | string): string[];
  private mapObjectToPath(routeOrPath);
  private validateGlobalPath(path);
  private validateRoutePath(path);
}
