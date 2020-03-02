import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { CoreModule } from './core/core.module';

@Module({
  imports: [CoreModule, CatsModule],
})
export class AppModule {}
