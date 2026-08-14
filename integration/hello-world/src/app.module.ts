import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module.js';
import { HostArrayModule } from './host-array/host-array.module.js';
import { HostModule } from './host/host.module.js';

@Module({
  imports: [HelloModule, HostModule, HostArrayModule],
})
export class AppModule {}
