import { DynamicModule, Module, Optional, Provider } from '@nestjs/common';
import { MULTER_MODULE_ADAPTER, MULTER_MODULE_OPTIONS } from './constants';
import {
  MulterModuleAsyncOptions,
  MulterModuleOptions,
  MulterOptionsFactory,
} from './interfaces/files-upload-module.interface';

@Module({})
export class MulterModule {
  static register(
    options: MulterModuleOptions = {},
    adapter: any,
  ): DynamicModule {
    return {
      module: MulterModule,
      providers: [
        { provide: MULTER_MODULE_OPTIONS, useValue: options },
        {
          provide: MULTER_MODULE_ADAPTER,
          useValue: adapter,
        },
      ],
      exports: [MULTER_MODULE_OPTIONS, MULTER_MODULE_ADAPTER],
    };
  }

  static registerAsync(
    options: MulterModuleAsyncOptions,
    adapter: any,
  ): DynamicModule {
    return {
      module: MulterModule,
      imports: options.imports,
      providers: this.createAsyncProviders(options, adapter),
      exports: [MULTER_MODULE_OPTIONS, MULTER_MODULE_ADAPTER],
    };
  }

  private static createAsyncProviders(
    options: MulterModuleAsyncOptions,
    adapter: any,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: MULTER_MODULE_ADAPTER,
          useValue: adapter,
        },
      ];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: MULTER_MODULE_ADAPTER,
        useValue: adapter,
      },
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: MulterModuleAsyncOptions,
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
      useFactory: async (optionsFactory: MulterOptionsFactory) =>
        optionsFactory.createMulterOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
