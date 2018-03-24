import { Constructor } from './merge-with-values.util';
import { NestMiddleware } from '../interfaces/middlewares/nest-middleware.interface';
import { Injectable } from '../decorators/core/component.decorator';

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
