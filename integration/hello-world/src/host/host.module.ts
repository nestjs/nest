import { Module } from '@nestjs/common';
import { HostController } from './host.controller.js';
import { HostService } from './host.service.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HostController],
  providers: [HostService, UsersService],
})
export class HostModule {}
