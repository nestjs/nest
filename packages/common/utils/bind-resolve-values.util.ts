import { Injectable } from '../decorators/core';
import { NestMiddleware } from '../interfaces/middleware/nest-middleware.interface';
import { Constructor } from './merge-with-values.util';

export const BindResolveMiddlewareValues = <
  T extends Constructor<NestMiddleware>
>(
  data: Array<any>,
) => {
  return (Metatype: T): any => {
    const type = class extends Metatype {
      public resolve() {
        return super.resolve(...data);
      }
    };
    const token = Metatype.name + JSON.stringify(data);
    Object.defineProperty(type, 'name', { value: token });
    Injectable()(type);
    return type;
  };
};
