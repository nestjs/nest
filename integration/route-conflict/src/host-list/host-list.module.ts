import { Module } from '@nestjs/common';
import { RepeatedHostController } from './repeated-host.controller.js';
import { TwoHostsController } from './two-hosts.controller.js';

@Module({
  controllers: [RepeatedHostController, TwoHostsController],
})
export class HostListModule {}
