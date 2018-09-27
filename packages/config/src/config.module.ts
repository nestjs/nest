import { Module, MODULE_INIT, Global } from '@nest/core';

import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  public static load(path: string) {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: MODULE_INIT,
          useFactory: (config: ConfigService) => config.load(path),
          deps: [ConfigService],
          multi: true,
        },
      ],
    };
  }
}
