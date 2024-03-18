import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('hello/:name')
  getHello(@Req() req): string {
    return 'Hello: ' + req.extras?.data;
  }

  @Get('params')
  getParams(@Req() req): any {
    return req.middlewareParams;
  }

  @Get('health')
  getHealth(): string {
    return 'up';
  }

  @Get('test')
  getTest(): string {
    return 'test';
  }

  @Post('test')
  postTest(): string {
    return 'test';
  }

  @Get()
  getHome(@Req() req) {
    return 'Extras: ' + req.extras?.data + ', Count: ' + req.count;
  }

  @Get('count')
  getCount(@Req() req) {
    return req.count;
  }
}
