import { Module } from '@nestjs/common';

import { UsersService } from './users/users.service';
import { HostController } from './host.controller';
import { HostService } from './host.service';

@Module({
  controllers: [HostController],
  providers: [HostService, UsersService],
})
export class HostModule {}
