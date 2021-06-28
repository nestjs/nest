import { CacheModule, Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { MultiStoreController } from './multi-store.controller';

@Module({
  imports: [CacheModule.register([
      {
        store: 'memory',
        max: 100,
        ttl: 10,
      },
      {
        store: redisStore,
        host: 'localhost',
        port: 6379,
        db: 0,
        ttl: 600
      }
    ],
  )],
  controllers: [MultiStoreController],
})
export class MultiStoreModule {}
