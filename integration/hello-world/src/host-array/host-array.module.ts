import { Module } from '@nestjs/common';
import { HostArrayController } from './host-array.controller';
import { HostArrayService } from './host-array.service';
import { UsersService } from './users/users.service';

@Module({
  controllers: [HostArrayController],
  providers: [HostArrayService, UsersService],
})
export class HostArrayModule {}
