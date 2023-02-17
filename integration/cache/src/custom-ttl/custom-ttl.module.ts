import { CacheModule, Module } from '@nestjs/common';
import { CustomTtlController } from './custom-ttl.controller';

@Module({
  imports: [CacheModule.register()],
  controllers: [CustomTtlController],
})
export class CustomTtlModule {}
