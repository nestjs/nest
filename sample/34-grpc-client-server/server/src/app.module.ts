import { Module } from '@nestjs/common';
import { HeroModule } from './hero/hero.module';
import { HelloworldModule } from './helloworld/helloworld.module';

@Module({
  imports: [HeroModule, HelloworldModule],
})
export class AppModule {}
