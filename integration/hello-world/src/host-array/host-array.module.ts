import { Module } from '@nestjs/common';
import { HostArrayController } from './host-array.controller.js';
import { HostArrayService } from './host-array.service.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HostArrayController],
  providers: [HostArrayService, UsersService],
})
export class HostArrayModule {}
