import { Module } from '@nestjs/common';
import { LowerHexController } from './lower-hex.controller.js';
import { UpperHexController } from './upper-hex.controller.js';

@Module({
  controllers: [UpperHexController, LowerHexController],
})
export class PercentEncodedModule {}
