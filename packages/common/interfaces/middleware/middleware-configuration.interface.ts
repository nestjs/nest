import { RequestMethod } from '../../enums';
import { Type } from '../type.interface';

export interface RouteInfo {
  path: string;
  method: RequestMethod;
  isRequestMapping?: boolean;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
