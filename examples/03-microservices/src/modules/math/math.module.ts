import { Module } from '@nestjs/core';
import { MathController } from './math.controller';

@Module({
    controllers: [MathController],
})
export class MathModule {}
