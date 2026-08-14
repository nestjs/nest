import { Module } from '@nestjs/common';
import { DuplicateAController } from './duplicate-a.controller.js';
import { DuplicateBController } from './duplicate-b.controller.js';

@Module({
  controllers: [DuplicateAController, DuplicateBController],
})
export class DuplicateModule {}
