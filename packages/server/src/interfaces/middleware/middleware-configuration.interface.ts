import { Type } from '@nest/core';

import { RequestMethod } from '../../enums';

export interface RouteInfo {
  path: string;
  method: keyof RequestMethod;
}

export interface MiddlewareConfiguration<T> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
