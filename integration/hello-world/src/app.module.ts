import { Module } from '@nestjs/common';

import { HelloModule } from './hello/hello.module';
import { HostModule } from './host/host.module';
import { HostArrayModule } from './host-array/host-array.module';

@Module({
  imports: [HelloModule, HostModule, HostArrayModule],
})
export class ApplicationModule {}
