import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';

@Module({
  controllers: [AccountsController],
})
export class SameShapeModule {}
