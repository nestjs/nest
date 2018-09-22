import { Module } from '../decorators';
import { DynamicModule, Provider } from '../interfaces';
import { CACHE_MANAGER, CACHE_MODULE_OPTIONS } from './cache.constants';
import { createCacheManager } from './cache.providers';
import {
  CacheModuleAsyncOptions,
  CacheModuleOptions,
  CacheOptionsFactory,
} from './interfaces/cache-module.interface';

@Module({
  providers: [createCacheManager()],
  exports: [CACHE_MANAGER],
})
export class CacheModule {
  static register(options: CacheModuleOptions = {}): DynamicModule {
    return {
      module: CacheModule,
      providers: [{ provide: CACHE_MODULE_OPTIONS, useValue: options }],
    };
  }

  static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: options.imports,
      providers: this.createAsyncProviders(options),
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
        await optionsFactory.createCacheOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
