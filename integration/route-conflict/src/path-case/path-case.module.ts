import { Module } from '@nestjs/common';
import { LowerOrdersController } from './lower-orders.controller.js';
import { LowerUsersController } from './lower-users.controller.js';
import { UpperOrdersController } from './upper-orders.controller.js';
import { UpperUsersController } from './upper-users.controller.js';

@Module({
  controllers: [
    LowerUsersController,
    UpperUsersController,
    LowerOrdersController,
    UpperOrdersController,
  ],
})
export class PathCaseModule {}
