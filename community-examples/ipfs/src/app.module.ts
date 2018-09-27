import { Module, APP_INIT } from '@nest/core';
import { ConfigModule, ConfigService } from '@nest/config';
import { CollectionModule, IpfsModule } from '@nest/ipfs';
import * as path from 'path';

import { UserCollection } from './user.collection';
import { TestService } from './test.service';

// @TODO: Gets created in wrong order
@Module({
  imports: [
    ConfigModule.load(path.join(__dirname, '../config/*')),
    IpfsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => config.get('ipfs'),
      deps: [ConfigService],
    }),
    CollectionModule.forFeature([UserCollection]),
  ],
  providers: [
    TestService,
    {
      provide: APP_INIT,
      useFactory: (test: TestService) => test.start(),
      deps: [TestService],
      multi: true,
    },
  ],
})
export class AppModule {}
