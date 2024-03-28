import { Module } from '@nestjs/common';
import { HeroModule } from './hero/hero.module';

@Module({
  imports: [HeroModule],
})
export class AppModule {}
