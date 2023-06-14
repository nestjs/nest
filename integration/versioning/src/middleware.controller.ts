import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: '1',
})
export class MiddlewareController {
  @Get('/')
  hello() {
    return 'Hello from "MiddlewareController"!';
  }

  @Version('2')
  @Get('/override')
  hellov2() {
    return 'Hello from "MiddlewareController"!';
  }
}
