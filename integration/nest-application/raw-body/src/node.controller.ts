import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import type { NodeRequest } from '@nestjs/platform-node';

@Controller()
export class NodeController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<NodeRequest>) {
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
