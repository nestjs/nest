import { Module } from '@nestjs/common';
import { HeroController } from './hero.controller';

@Module({
  imports: [],
  controllers: [HeroController],
})
export class HeroModule {}
