import { HttpServer } from '@nestjs/common';
import { ResolvedRoute } from './resolved-route.interface.js';
import { RouteResolutionOptions } from './route-resolution-options.interface.js';

export interface Resolver {
  resolve(
    applicationRef: HttpServer,
    basePath: string,
    options?: RouteResolutionOptions,
  ): void;
  registerResolvedRoute(applicationRef: HttpServer, route: ResolvedRoute): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
}
