import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<FastifyRequest>) {
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
