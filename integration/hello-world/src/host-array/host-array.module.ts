import { Module } from '@nestjs/common';

import { UsersService } from './users/users.service';
import { HostArrayController } from './host-array.controller';
import { HostArrayService } from './host-array.service';

@Module({
  controllers: [HostArrayController],
  providers: [HostArrayService, UsersService],
})
export class HostArrayModule {}
