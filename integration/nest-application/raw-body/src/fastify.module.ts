import { Module } from '@nestjs/common';
import { FastifyController } from './fastify.controller';

@Module({
  controllers: [FastifyController],
})
export class FastifyModule {}
