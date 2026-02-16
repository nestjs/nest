import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MULTER_MODULE_OPTIONS } from './files.constants';
import {
  H3MulterModuleAsyncOptions,
  H3MulterModuleOptions,
  H3MulterOptionsFactory,
} from './interfaces';

/**
 * Module for configuring H3 file upload options globally.
 *
 * @publicApi
 */
@Module({})
export class H3MulterModule {
  /**
   * Register the module with static options.
   *
   * @param options The multer options to use
   * @returns A dynamic module
   */
  static register(options: H3MulterModuleOptions = {}): DynamicModule {
    return {
      module: H3MulterModule,
      providers: [{ provide: MULTER_MODULE_OPTIONS, useValue: options }],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  /**
   * Register the module with async options.
   *
   * @param options The async options for creating multer options
   * @returns A dynamic module
   */
  static registerAsync(options: H3MulterModuleAsyncOptions): DynamicModule {
    return {
      module: H3MulterModule,
      imports: options.imports || [],
      providers: this.createAsyncProviders(options),
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  private static createAsyncProviders(
    options: H3MulterModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: H3MulterModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: MULTER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: MULTER_MODULE_OPTIONS,
      useFactory: async (optionsFactory: H3MulterOptionsFactory) =>
        optionsFactory.createMulterOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}
