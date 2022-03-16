import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class ExpressController {
  @Post()
  getRawBody(@Req() req: Request) {
    return { raw: req.rawBody.toString() };
  }
}
