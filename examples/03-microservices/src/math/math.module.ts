import { Module } from '@nestjs/common';
import { MathController } from './math.controller';

@Module({
  controllers: [MathController],
})
export class MathModule {}
