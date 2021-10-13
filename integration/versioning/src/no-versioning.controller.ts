import { Controller, Get } from '@nestjs/common';

@Controller('foo')
export class NoVersioningController {
  @Get('/bar')
  helloFoo() {
    return 'Hello FooBar!';
  }
}
