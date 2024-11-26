/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ConfigurableModuleAsyncOptions } from './configurable-module-async-options.interface';
import { ConfigurableModuleCls } from './configurable-module-cls.interface';

/**
 * Configurable module host. See properties for more details
 *
 * @publicApi
 */
export interface ConfigurableModuleHost<
  ModuleOptions = Record<string, unknown>,
  MethodKey extends string = string,
  FactoryClassMethodKey extends string = string,
  ExtraModuleDefinitionOptions = {},
> {
  /**
   * Class that represents a blueprint/prototype for a configurable Nest module.
   * This class provides static methods for constructing dynamic modules. Their names
   * can be controlled through the "MethodKey" type argument.
   *
   * Your module class should inherit from this class to make the static methods available.
   *
   * @example
   * ```typescript
   * @Module({})
   * class IntegrationModule extends ConfigurableModuleCls {
   *  // ...
   * }
   * ```
   */
  ConfigurableModuleClass: ConfigurableModuleCls<
    ModuleOptions,
    MethodKey,
    FactoryClassMethodKey,
    ExtraModuleDefinitionOptions
  >;
  /**
   * Module options provider token. Can be used to inject the "options object" to
   * providers registered within the host module.
   */
  MODULE_OPTIONS_TOKEN: string | symbol;
  /**
   * Can be used to auto-infer the compound "async module options" type.
   * Note: this property is not supposed to be used as a value.
   *
   * @example
   * ```typescript
   * @Module({})
   * class IntegrationModule extends ConfigurableModuleCls {
   *  static module = initializer(IntegrationModule);
   *
   * static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
   *  return super.registerAsync(options);
   * }
   * ```
   */
  ASYNC_OPTIONS_TYPE: ConfigurableModuleAsyncOptions<
    ModuleOptions,
    FactoryClassMethodKey
  > &
    Partial<ExtraModuleDefinitionOptions>;
  /**
   * Can be used to auto-infer the compound "module options" type (options interface + extra module definition options).
   * Note: this property is not supposed to be used as a value.
   *
   * @example
   * ```typescript
   * @Module({})
   * class IntegrationModule extends ConfigurableModuleCls {
   *  static module = initializer(IntegrationModule);
   *
   * static register(options: typeof OPTIONS_TYPE): DynamicModule {
   *  return super.register(options);
   * }
   * ```
   */
  OPTIONS_TYPE: ModuleOptions & Partial<ExtraModuleDefinitionOptions>;
}
