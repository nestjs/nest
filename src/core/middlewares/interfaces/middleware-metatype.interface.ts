import { NestMiddleware } from './nest-middleware.interface';
import { Metatype } from '../../../common/interfaces/metatype.interface';

export interface MiddlewareMetatype extends Metatype<NestMiddleware> {}