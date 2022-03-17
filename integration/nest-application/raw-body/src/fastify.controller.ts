import { Controller, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: FastifyRequest) {
    return { raw: req.rawBody.toString() };
  }
}
