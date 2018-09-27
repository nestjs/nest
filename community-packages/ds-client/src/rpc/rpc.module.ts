import { APP_INIT, Module, ModuleWithProviders, Type } from '@nest/core';

import { DsRpcService } from './rpc.service';
import { RpcProvider } from './interfaces';

@Module()
export class DsRpcModule {
  public static forFeature(
    providers: Type<RpcProvider>[],
  ): ModuleWithProviders {
    return {
      module: DsRpcModule,
      providers: [
        ...providers,
        DsRpcService,
        {
          provide: APP_INIT,
          useFactory: (rpc: DsRpcService) => rpc.add(providers),
          deps: [DsRpcService],
          multi: true,
        },
      ],
    };
  }
}
