import { Module } from '@nestjs/core';
import { CatsModule } from './cats/cats.module';

@Module({
  modules: [CatsModule],
})
export class ApplicationModule {}
