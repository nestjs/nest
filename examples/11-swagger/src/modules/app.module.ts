import { Module, NestModule, MiddlewaresConsumer } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
  modules: [CatsModule],
})
export class ApplicationModule {}
