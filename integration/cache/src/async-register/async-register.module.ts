import { CacheModule, Module } from '@nestjs/common';
import { AsyncRegisterController } from './async-register.controller';
import { CacheConfig } from './config/cache.config';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfig,
    }),
  ],
  controllers: [AsyncRegisterController],
})
export class AsyncRegisterModule {}
