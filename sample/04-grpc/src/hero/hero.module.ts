import { Module } from '@nestjs/common';
import { HeroController } from './hero.controller';

@Module({
  controllers: [HeroController],
})
export class HeroModule {}
