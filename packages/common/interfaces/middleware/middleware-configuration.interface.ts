import { Type } from '../type.interface';

export interface MiddlewareConfiguration {
  middleware: any;
  forRoutes: (Type<any> | string)[];
}
