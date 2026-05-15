import { Module } from '@nestjs/common';
import { FastifyController } from './fastify.controller.js';

@Module({
  controllers: [FastifyController],
})
export class FastifyModule {}
