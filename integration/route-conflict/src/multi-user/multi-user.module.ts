import { Module } from '@nestjs/common';
import { UserImagesController } from './user-images.controller.js';
import { UsersController } from './users.controller.js';

@Module({
  controllers: [UsersController, UserImagesController],
})
export class MultiUserModule {}
