import { Module } from '@nestjs/common';
import { MathModule } from './math/math.module';

@Module({
    modules: [MathModule],
})
export class ApplicationModule {}