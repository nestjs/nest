import { Global, Module } from '@nestjs/common';
import { ApiDiscoveryService } from './api-discovery.service';

@Global()
@Module({
  providers: [ApiDiscoveryService],
  exports: [ApiDiscoveryService],
})
export class GlobalModule {}
