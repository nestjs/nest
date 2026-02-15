import { Module } from '@nestjs/common';
import { HeroModule } from './hero/hero.module.js';

@Module({
  imports: [HeroModule],
})
export class AppModule {}
