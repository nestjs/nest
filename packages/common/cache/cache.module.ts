import { Module } from '../decorators';
import { DynamicModule, Provider } from '../interfaces';
import { CACHE_MANAGER, CACHE_MODULE_OPTIONS } from './cache.constants';
import { createCacheManager } from './cache.providers';
import {
  CacheModuleAsyncOptions,
  CacheModuleOptions,
  CacheOptionsFactory,
} from './interfaces/cache-module.interface';

/**
 * Module that provides Nest cache-manager.
 *
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @publicApi
 */
@Module({
  providers: [createCacheManager()],
  exports: [CACHE_MANAGER],
})
export class CacheModule {
  /**
   * Configure the cache manager statically.
   *
   * @param options options to configure the cache manager
   *
   * @see [Customize caching](https://docs.nestjs.com/techniques/caching#customize-caching)
   */
  static register(options: CacheModuleOptions = {}): DynamicModule {
    return {
      module: CacheModule,
      providers: [{ provide: CACHE_MODULE_OPTIONS, useValue: options }],
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
  static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        ...(options.extraProviders || []),
      ],
    };
  }

  private static createAsyncProviders(
    options: CacheModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: CacheModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: CACHE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: CACHE_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CacheOptionsFactory) =>
        optionsFactory.createCacheOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
