import { Module } from '@nestjs/common';
import { MathModule } from './math/math.module';

@Module({
  imports: [MathModule],
})
export class ApplicationModule {}
