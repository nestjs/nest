import { RequestMethod } from '../../enums/index.js';
import { Type } from '../type.interface.js';
import { VersionValue } from '../version-options.interface.js';

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  version?: VersionValue;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
