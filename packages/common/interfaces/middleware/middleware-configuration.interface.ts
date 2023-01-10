import { RequestMethod } from '../../enums';
import { Type } from '../type.interface';
import { VersionValue } from '../version-options.interface';

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
