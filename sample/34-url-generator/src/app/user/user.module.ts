import { Module } from '@nestjs/common';
import { UserController } from './user.controller';

@Module({
  imports: [],
  controllers: [UserController],
})
export class UserModule {}
