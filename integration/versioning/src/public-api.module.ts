import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';

@Module({
  controllers: [PublicApiController],
})
export class PublicApiModule {}
