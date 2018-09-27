import { Type } from '@nest/core';

import { NestMiddleware } from './nest-middleware.interface';

export interface MiddlewareWrapper {
  instance: NestMiddleware;
  metatype: Type<NestMiddleware>;
}
