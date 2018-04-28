import { Constructor } from './merge-with-values.util';
import { NestMiddleware } from '../interfaces/middleware/nest-middleware.interface';
export declare const BindResolveMiddlewareValues: <T extends Constructor<NestMiddleware>>(data: any[]) => (Metatype: T) => any;
