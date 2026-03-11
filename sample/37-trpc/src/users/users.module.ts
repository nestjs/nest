import { Module } from '@nestjs/common';
import { UsersRouter } from './users.router';
import { UsersService } from './users.service';
import { RemapBadRequestFilter } from '../common/filters/remap-bad-request.filter';

@Module({
  providers: [UsersService, UsersRouter, RemapBadRequestFilter],
  exports: [UsersService],
})
export class UsersModule {}
