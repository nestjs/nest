import { Module } from '@nestjs/common';
import { MathModule } from './math/math.module.js';

@Module({
  imports: [MathModule],
})
export class AppModule {}
