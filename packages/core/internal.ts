/**
 * Internal module - not part of the public API.
 * These exports are used by sibling @nestjs packages.
 * Do not depend on these in your application code.
 * @internal
 * @module
 */

// Errors
export * from './errors/exceptions/index.js';
export { InvalidExceptionFilterException } from './errors/exceptions/invalid-exception-filter.exception.js';
export { RuntimeException } from './errors/exceptions/runtime.exception.js';

// Constants
export { MESSAGES } from './constants.js';

// Scanner
export { DependenciesScanner } from './scanner.js';

// Injector
export { STATIC_CONTEXT } from './injector/constants.js';
export { Injector, InjectorDependencyContext } from './injector/injector.js';
export { InstanceLoader } from './injector/instance-loader.js';
export { InstanceWrapper } from './injector/instance-wrapper.js';
export { InternalCoreModule } from './injector/internal-core-module/index.js';
export { Module } from './injector/module.js';
export * from './inspector/index.js';

// Helpers
export { ContextUtils, ParamProperties } from './helpers/context-utils.js';
export { ExecutionContextHost } from './helpers/execution-context-host.js';
export { HandlerMetadataStorage } from './helpers/handler-metadata-storage.js';
export { loadAdapter } from './helpers/load-adapter.js';
export { optionalRequire } from './helpers/optional-require.js';
export { RouterMethodFactory } from './helpers/router-method-factory.js';
export { makeSafeInstanceDecorator } from './helpers/safe-instance-decorator.js';

// Helpers - interfaces
export { ParamsMetadata } from './helpers/interfaces/index.js';

// Guards
export { FORBIDDEN_MESSAGE } from './guards/constants.js';
export { GuardsConsumer } from './guards/guards-consumer.js';
export { GuardsContextCreator } from './guards/guards-context-creator.js';

// Pipes
export { ParamsTokenFactory } from './pipes/params-token-factory.js';
export { PipesConsumer } from './pipes/pipes-consumer.js';
export { PipesContextCreator } from './pipes/pipes-context-creator.js';

// Interceptors
export { InterceptorsConsumer } from './interceptors/interceptors-consumer.js';
export { InterceptorsContextCreator } from './interceptors/interceptors-context-creator.js';

// Exceptions
export { BaseExceptionFilterContext } from './exceptions/base-exception-filter-context.js';

// Router
export { LegacyRouteConverter } from './router/legacy-route-converter.js';
export { REQUEST_CONTEXT_ID } from './router/request/request-constants.js';

// Inspector
export { NoopGraphInspector } from './inspector/noop-graph-inspector.js';
export { UuidFactory, UuidFactoryMode } from './inspector/uuid-factory.js';

// Interfaces
export { ModuleDefinition } from './interfaces/module-definition.interface.js';
export { ModuleOverride } from './interfaces/module-override.interface.js';
