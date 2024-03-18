import { Module } from '@nestjs/common';
import { HelloworldController } from './helloworld.controller';

@Module({
  imports: [],
  controllers: [HelloworldController],
})
export class HelloworldModule {}
