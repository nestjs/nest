import { CacheModule, Module } from '@nestjs/common';
import { AsyncRegisterExtraController } from './async-register-extra.controller';
import { CacheConfig } from './config/cache.config';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      extraProviders: [ConfigModule],
      isGlobal: true,
      useClass: CacheConfig,
    }),
  ],
  controllers: [AsyncRegisterExtraController],
})
export class AsyncRegisterExtraModule {}
