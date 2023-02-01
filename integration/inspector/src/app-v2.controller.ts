import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  version: '2',
})
export class AppV2Controller {
  @Get('/')
  helloWorldV2() {
    return 'Hello World V2!';
  }

  @Version('3')
  @Get('/:param/hello')
  paramV1() {
    return 'Parameter V2!';
  }
}
