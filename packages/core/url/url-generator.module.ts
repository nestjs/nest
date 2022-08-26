import { DynamicModule, Module, Provider } from '@nestjs/common';
import { UrlGenerator } from './url-generator';
import { UrlGeneratorModuleOptions } from './interfaces/url-generator-options.interface';

export const URL_GENERATOR_OPTIONS = Symbol('URL_GENERATOR_OPTIONS');

@Module({})
export class UrlGeneratorModule {
  static forRoot(options?: UrlGeneratorModuleOptions): DynamicModule {
    const provider = this.createUrlGeneratorProvider(options);

    return {
      module: UrlGeneratorModule,
      imports: options?.imports || [],
      providers: [provider, UrlGenerator],
      exports: [UrlGenerator],
      global: true,
    };
  }

  private static createUrlGeneratorProvider(
    options?: UrlGeneratorModuleOptions,
  ): Provider {
    if (options?.useFactory) {
      return {
        provide: URL_GENERATOR_OPTIONS,
        useFactory: options.useFactory,
        inject: options?.inject || [],
      };
    }
    return {
      provide: URL_GENERATOR_OPTIONS,
      useValue: {
        absoluteUrl: options?.absoluteUrl || '',
      },
    };
  }
}
