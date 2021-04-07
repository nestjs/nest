import { DynamicModule, Module, Provider } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

import {
  MulterModuleAsyncOptions,
  MulterModuleOptions,
  MulterOptionsFactory,
} from './interfaces/files-upload-module.interface';
import { MULTER_MODULE_OPTIONS } from './files.constants';
import { MULTER_MODULE_ID } from './multer.constants';

@Module({})
export class MulterModule {
  static register(options: MulterModuleOptions = {}): DynamicModule {
    return {
      module: MulterModule,
      providers: [
        { provide: MULTER_MODULE_OPTIONS, useValue: options },
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  static registerAsync(options: MulterModuleAsyncOptions): DynamicModule {
    return {
      module: MulterModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: MULTER_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  private static createAsyncProviders(
    options: MulterModuleAsyncOptions,
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
