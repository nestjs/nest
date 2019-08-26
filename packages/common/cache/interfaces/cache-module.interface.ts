import { ModuleMetadata, Provider, Type } from '../../interfaces';
import { CacheManagerOptions } from './cache-manager.interface';

export interface CacheModuleOptions extends CacheManagerOptions {
  [key: string]: any;
}

/**
 * Interface describing a `CacheOptionsFactory`.  Providers supplying configuration
 * options for the Cache module must implement this interface.
 *
 * @see [Async configuration](https://docs.nestjs.com/techniques/caching#async-configuration)
 *
 * @publicApi
 */
export interface CacheOptionsFactory {
  createCacheOptions(): Promise<CacheModuleOptions> | CacheModuleOptions;
}

/**
 * Options for dynamically configuring the Cache module.
 *
 * @see [Async configuration](https://docs.nestjs.com/techniques/caching#async-configuration)
 *
 * @publicApi
 */
export interface CacheModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Injection token resolving to an existing provider. The provider must implement
   * the `CacheOptionsFactory` interface.
   */
  useExisting?: Type<CacheOptionsFactory>;
  /**
   * Injection token resolving to a class that will be instantiated as a provider.
   * The class must implement the `CacheOptionsFactory` interface.
   */
  useClass?: Type<CacheOptionsFactory>;
  /**
   * Function returning options (or a Promise resolving to options) to configure the
   * cache module.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<CacheModuleOptions> | CacheModuleOptions;
  /**
   * Dependencies that a Factory may inject.
   */
  inject?: any[];
  extraProviders?: Provider[];
}
