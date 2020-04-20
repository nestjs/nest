import * as AxiosModule from 'axios';
import { Module } from '../decorators/modules/module.decorator';
import { DynamicModule, Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';
import { randomStringGenerator } from '../utils/random-string-generator.util';
import {
  AXIOS_MODULE_TOKEN,
  AXIOS_INSTANCE_TOKEN,
  HTTP_MODULE_ID,
  HTTP_MODULE_OPTIONS,
} from './http.constants';
import { HttpService } from './http.service';
import {
  HttpModuleAsyncOptions,
  HttpModuleOptions,
  HttpModuleOptionsFactory,
} from './interfaces';

@Module({
  providers: [
    HttpService,
    {
      provide: AXIOS_INSTANCE_TOKEN,
      useFactory: ({ default: Axios }: typeof AxiosModule) => Axios,
      inject: [AXIOS_MODULE_TOKEN],
    },
    {
      provide: AXIOS_MODULE_TOKEN,
      useFactory: () => loadPackage('axios', 'HttpModule'),
    },
  ],
  exports: [HttpService],
})
export class HttpModule {
  static register(config: HttpModuleOptions): DynamicModule {
    return {
      module: HttpModule,
      providers: [
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useFactory: ({ default: Axios }: typeof AxiosModule) =>
            Axios.create(config),
          inject: [AXIOS_MODULE_TOKEN],
        },
        {
          provide: HTTP_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
    };
  }

  static registerAsync(options: HttpModuleAsyncOptions): DynamicModule {
    return {
      module: HttpModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useFactory: (
            config: HttpModuleOptions,
            { default: Axios }: typeof AxiosModule,
          ) => Axios.create(config),
          inject: [HTTP_MODULE_OPTIONS, AXIOS_INSTANCE_TOKEN],
        },
        {
          provide: HTTP_MODULE_ID,
          useValue: randomStringGenerator(),
        },
        ...(options.extraProviders || []),
      ],
    };
  }

  private static createAsyncProviders(
    options: HttpModuleAsyncOptions,
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
    options: HttpModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: HTTP_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: HTTP_MODULE_OPTIONS,
      useFactory: async (optionsFactory: HttpModuleOptionsFactory) =>
        optionsFactory.createHttpOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
