import { Constructor } from './merge-with-values.util';
import { NestMiddleware } from '../interfaces/middlewares/nest-middleware.interface';
export declare const BindResolveMiddlewareValues: <
  T extends Constructor<NestMiddleware>
>(
  data: any[]
) => (Metatype: T) => any;
