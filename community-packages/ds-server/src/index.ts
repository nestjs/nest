import { Module, APP_INIT, DynamicModule } from '@nest/core';
import Deepstream = require('deepstream.io');

export const DEEPSTREAM_SERVER = Symbol.for('DEEPSTREAM_SERVER');

@Module()
export class DsServerModule {
  public static forRoot(configFilePath?: string): DynamicModule {
    const server = new Deepstream(configFilePath);

    return {
      module: DsServerModule,
      exports: [DEEPSTREAM_SERVER],
      providers: [
        {
          provide: DEEPSTREAM_SERVER,
          useValue: server,
        },
        {
          provide: APP_INIT,
          useFactory: () => server.start(),
          multi: true,
        },
      ],
    };
  }
}
