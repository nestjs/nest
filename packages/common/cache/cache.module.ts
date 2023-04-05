import { Module } from '../decorators';
import { DynamicModule } from '../interfaces';
import { CACHE_MANAGER } from './cache.constants';
import { ConfigurableModuleClass } from './cache.module-definition';
import { createCacheManager } from './cache.providers';
import {
  CacheModuleAsyncOptions,
  CacheModuleOptions,
} from './interfaces/cache-module.interface';

/**
 * Module that provides Nest cache-manager.
 *
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 * @deprecated `CacheModule` (from the `@nestjs/common` package) is deprecated and will be removed in the next major release. Please, use the `@nestjs/cache-manager` package instead
 * @publicApi
 */
@Module({
  providers: [createCacheManager()],
  exports: [CACHE_MANAGER],
})
export class CacheModule extends ConfigurableModuleClass {
  /**
   * Configure the cache manager statically.
   *
   * @param options options to configure the cache manager
   *
   * @see [Customize caching](https://docs.nestjs.com/techniques/caching#customize-caching)
   */
  static register<StoreConfig extends Record<any, any> = Record<string, any>>(
    options: CacheModuleOptions<StoreConfig> = {} as any,
  ): DynamicModule {
    return {
      global: options.isGlobal,
      ...super.register(options),
    };
  }

  /**
   * Configure the cache manager dynamically.
   *
   * @param options method for dynamically supplying cache manager configuration
   * options
   *
   * @see [Async configuration](https://docs.nestjs.com/techniques/caching#async-configuration)
   */
  static registerAsync<
    StoreConfig extends Record<any, any> = Record<string, any>,
  >(options: CacheModuleAsyncOptions<StoreConfig>): DynamicModule {
    const moduleDefinition = super.registerAsync(options);

    return {
      global: options.isGlobal,
      ...moduleDefinition,
      providers: options.extraProviders
        ? moduleDefinition.providers.concat(options.extraProviders)
        : moduleDefinition.providers,
    };
  }
}
