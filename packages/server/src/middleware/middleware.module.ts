import { Module } from '@nest/core';

import { MiddlewareContainer } from './middleware-container.service';
import { MiddlewareResolver } from './middleware-resolver.service';
import { RoutesMapper } from './routes-mapper.service';
import { Middleware } from './middleware.service';

@Module({
  exports: [Middleware],
  providers: [
    MiddlewareContainer,
    MiddlewareResolver,
    Middleware,
    RoutesMapper,
  ],
})
export class MiddlewareModule {}
