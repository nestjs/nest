import { Module } from '@nestjs/core';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
    modules: [CatsModule],
})
export class ApplicationModule {}
