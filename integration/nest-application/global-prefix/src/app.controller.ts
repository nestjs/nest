import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('hello/:name')
  getHello(@Req() req): string {
    return 'Hello: ' + req.extras?.data;
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
}
