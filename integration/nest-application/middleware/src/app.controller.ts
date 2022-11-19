import { Controller, Get, Req, Version } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('foo')
  async foo(@Req() req) {
    return req.extras;
  }

  @Version('2')
  @Get('foo')
  async fooV2(@Req() req) {
    return req.extras;
  }
}
