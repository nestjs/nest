import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class AppController {
  @Get('hello')
  getValueSetByMiddleware(@Req() req: Request & { hello: boolean }): string {
    if (req.hello) {
      return 'hello';
    }
    return 'not-hello';
  }

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
