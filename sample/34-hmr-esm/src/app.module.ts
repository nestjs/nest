import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module.js';
import { CoreModule } from './core/core.module.js';

@Module({
  imports: [CoreModule, CatsModule],
})
export class AppModule {}
