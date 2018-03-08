import { Type } from './../type.interface';

export interface MiddlewareConfiguration {
  middlewares: any;
  forRoutes: (Type<any> | string)[];
}
