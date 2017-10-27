import { Module } from '@nestjs/core';
import { MathModule } from './math/math.module';

@Module({
    modules: [MathModule],
})
export class ApplicationModule {}
