import { Module } from '@nestjs/common';
import { LowerIdController } from './lower-id.controller.js';
import { UpperIdController } from './upper-id.controller.js';

@Module({
  controllers: [UpperIdController, LowerIdController],
})
export class RegexParamModule {}
