import {
  AsyncModuleConfig,
  DynamicModule,
  Module,
  ModuleWithProviders,
  Utils,
} from '@nest/core';

import { IpfsService } from './ipfs.service';
import { IPFS_PROVIDERS, IPFS_CLIENT_PROVIDER } from './providers';
import { IpfsConfig } from './interfaces';
import { IPFS_CONFIG } from './symbols';

@Module({
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IpfsModule {
  public static forRoot(options: IpfsConfig): ModuleWithProviders {
    return {
      module: IpfsModule,
      providers: [
        {
          provide: IPFS_CONFIG,
          useValue: options,
        },
        ...IPFS_PROVIDERS,
      ],
    };
  }

  public static forRootAsync(
    options: AsyncModuleConfig<IpfsConfig>,
  ): DynamicModule {
    return {
      module: IpfsModule,
      imports: options.imports,
      providers: [
        {
          provide: IPFS_CONFIG,
          ...Utils.omit(options, 'imports'),
        },
        ...IPFS_PROVIDERS,
      ],
    };
  }
}
