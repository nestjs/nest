import {
  NestMiddleware
} from '../interfaces/middlewares/nest-middleware.interface';

import {Component} from './decorators/component.decorator';
import {Constructor} from './merge-with-values.util';

export const BindResolveMiddlewareValues =
    <T extends Constructor<NestMiddleware>>(data: Array<any>) => {
      return (Metatype: T): any => {
        const type = class extends Metatype {
          public resolve() { return super.resolve(...data); }
        };
        const token = Metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', {value : token});
        Component()(type);
        return type;
      };
    };