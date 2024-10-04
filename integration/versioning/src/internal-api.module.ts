import { Module } from '@nestjs/common';
import { InternalApiController } from './internal-api.controller';

@Module({
  controllers: [InternalApiController],
})
export class InternalApiModule {}
