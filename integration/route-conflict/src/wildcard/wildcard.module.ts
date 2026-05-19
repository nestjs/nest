import { Module } from '@nestjs/common';
import { WildcardController } from './wildcard.controller.js';

@Module({
  controllers: [WildcardController],
})
export class WildcardModule {}
