import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';
import { HostArrayModule } from './host-array/host-array.module';
import { HostModule } from './host/host.module';

@Module({
  imports: [HelloModule, HostModule, HostArrayModule],
})
export class ApplicationModule {}
