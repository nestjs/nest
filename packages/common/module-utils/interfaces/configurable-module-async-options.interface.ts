import {
  FactoryProvider,
  ModuleMetadata,
  Provider,
  Type,
} from '../../interfaces';
import { DEFAULT_FACTORY_CLASS_METHOD_KEY } from '../constants';

/**
 * Interface that must be implemented by the module options factory class.
 * Method key varies depending on the "FactoryClassMethodKey" type argument.
 *
 * @publicApi
 */
export type ConfigurableModuleOptionsFactory<
  ModuleOptions,
  FactoryClassMethodKey extends string,
> = Record<
  `${FactoryClassMethodKey}`,
  () => Promise<ModuleOptions> | ModuleOptions
>;

/**
 * Interface that represents the module async options object
 * Factory method name varies depending on the "FactoryClassMethodKey" type argument.
 *
 * @publicApi
 */
export interface ConfigurableModuleAsyncOptions<
  ModuleOptions,
  FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
> extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Injection token resolving to an existing provider. The provider must implement
   * the corresponding interface.
   */
  useExisting?: Type<
    ConfigurableModuleOptionsFactory<ModuleOptions, FactoryClassMethodKey>
  >;
  /**
   * Injection token resolving to a class that will be instantiated as a provider.
   * The class must implement the corresponding interface.
   */
  useClass?: Type<
    ConfigurableModuleOptionsFactory<ModuleOptions, FactoryClassMethodKey>
  >;
  /**
   * Function returning options (or a Promise resolving to options) to configure the
   * cache module.
   */
  useFactory?: (...args: any[]) => Promise<ModuleOptions> | ModuleOptions;
  /**
   * Dependencies that a Factory may inject.
   */
  inject?: FactoryProvider['inject'];
  /**
   * List of parent module's providers that will be filtered to only provide necessary
   * providers for the 'inject' array
   * useful to pass options to nested async modules
   */
  provideInjectionTokensFrom?: Provider[];
}
