import {
  IS_REQUEST_MAPPING_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '../../constants';
import { RequestMethod } from '../../enums';
import { Type } from '../type.interface';
export interface RouteInfo {
  [PATH_METADATA]: string;
  [METHOD_METADATA]: RequestMethod;
  [IS_REQUEST_MAPPING_METADATA]?: boolean;
}

export interface MiddlewareConfiguration<T = any> {
  middleware: T;
  forRoutes: (Type<any> | string | RouteInfo)[];
}
