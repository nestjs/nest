import {
  AsyncModuleConfig,
  DynamicModule,
  Module,
  ModuleMetadata,
  Utils,
} from '@nest/core';

import { DEEPSTREAM_PROVIDERS, DEEPSTREAM_EXPORTS } from './providers';
import { DsClientConfig } from './ds-client-config.interface';
import { DEEPSTREAM_CLIENT_CONFIG } from './tokens';

@Module()
export class DsClientModule {
  public static forRootAsync(
    metadata: AsyncModuleConfig<Partial<DsClientConfig>>,
  ): DynamicModule {
    return {
      module: DsClientModule,
      exports: DEEPSTREAM_EXPORTS,
      imports: metadata.imports || [],
      providers: [
        {
          provide: DEEPSTREAM_CLIENT_CONFIG,
          ...Utils.omit<ModuleMetadata>(metadata, 'imports'),
        },
        ...DEEPSTREAM_PROVIDERS,
      ],
    };
  }

  public static forRoot(
    url: string,
    config: Partial<DsClientConfig>,
  ): DynamicModule {
    return {
      module: DsClientModule,
      // exports: DEEPSTREAM_EXPORTS,
      providers: [
        {
          provide: DEEPSTREAM_CLIENT_CONFIG,
          useValue: {
            url,
            ...config,
          } as DsClientConfig,
        },
        ...DEEPSTREAM_PROVIDERS,
      ],
    };
  }
}
