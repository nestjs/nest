import { Module } from '@nestjs/common';
import { CatsModule } from '#root/cats/cats.module.js';
import { CoreModule } from '#root/core/core.module.js';

@Module({
  imports: [CoreModule, CatsModule],
})
export class AppModule {}
