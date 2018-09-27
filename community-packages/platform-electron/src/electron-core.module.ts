import { APP_INIT, Module, DynamicModule } from '@nest/core';

import { ElectronService } from './electron.service';

@Module()
export class ElectronCoreModule {
  public static forRoot(options: any): DynamicModule {
    return {
      module: ElectronCoreModule,
      providers: [
        ElectronService,
        {
          provide: APP_INIT,
          useFactory: (electron: ElectronService) => electron.start(),
          deps: [ElectronService],
          multi: true,
        },
      ],
    };
  }
}
