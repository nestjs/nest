/**
 * Internal module - not part of the public API.
 * These exports are used by sibling @nestjs packages.
 * Do not depend on these in your application code.
 * @internal
 * @module
 */

// Constants
export * from './constants.js';

// Enums (internal)
export { RouteParamtypes } from './enums/route-paramtypes.enum.js';

// Utils
export * from './utils/shared.utils.js';
export * from './utils/load-package.util.js';
export * from './utils/cli-colors.util.js';
export * from './utils/random-string-generator.util.js';
export * from './utils/select-exception-filter-metadata.util.js';

// Interfaces (types not exposed at root due to name conflicts or internal use)
export type { Controller, Injectable } from './interfaces/index.js';
export type { NestApplicationContextOptions } from './interfaces/nest-application-context-options.interface.js';
export type { NestMicroserviceOptions } from './interfaces/microservices/nest-microservice-options.interface.js';
export type {
  CorsOptions,
  CorsOptionsDelegate,
  CustomOrigin,
} from './interfaces/external/cors-options.interface.js';
export type { ExceptionFilterMetadata } from './interfaces/exceptions/exception-filter-metadata.interface.js';
export type { RpcExceptionFilterMetadata } from './interfaces/exceptions/rpc-exception-filter-metadata.interface.js';
export type { VersionValue } from './interfaces/version-options.interface.js';
export type { GlobalPrefixOptions } from './interfaces/global-prefix-options.interface.js';
export type {
  MiddlewareConfiguration,
  RouteInfo,
} from './interfaces/middleware/middleware-configuration.interface.js';
export type { MiddlewareConfigProxy } from './interfaces/middleware/middleware-config-proxy.interface.js';
export type { ModuleMetadata } from './interfaces/modules/module-metadata.interface.js';
export type {
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from './interfaces/features/arguments-host.interface.js';
export type { RequestHandler } from './interfaces/http/http-server.interface.js';
export type {
  GetOrResolveOptions,
  SelectOptions,
} from './interfaces/nest-application-context.interface.js';
export type { ShutdownHooksOptions } from './interfaces/shutdown-hooks-options.interface.js';

// Decorators (internal)
export { assignMetadata } from './decorators/http/route-params.decorator.js';
