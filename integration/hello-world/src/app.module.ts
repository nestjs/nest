import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';
import { HostModule } from './host/host.module';

@Module({
  imports: [HelloModule, HostModule],
})
export class ApplicationModule {}
