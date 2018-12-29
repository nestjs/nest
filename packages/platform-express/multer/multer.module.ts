import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MULTER_MODULE_OPTIONS } from './files.constants';
import {
  MulterModuleAsyncOptions,
  MulterModuleOptions,
  MulterOptionsFactory,
} from './interfaces/files-upload-module.interface';

@Module({})
export class MulterModule {
  static register(options: MulterModuleOptions = {}): DynamicModule {
    return {
      module: MulterModule,
      providers: [{ provide: MULTER_MODULE_OPTIONS, useValue: options }],
      exports: [MULTER_MODULE_OPTIONS],
    };
  }

  static registerAsync(options: MulterModuleAsyncOptions): DynamicModule {
    return {
      module: MulterModule,
      imports: options.imports,
      providers: this.createAsyncProviders(options),
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
