import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('hello/:name')
  getHello(): string {
    return 'hello';
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
