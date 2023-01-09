import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  version: '3',
})
export class AppV3Controller {
  @Get()
  paramV3() {
    return 'V3';
  }

  @Version('4')
  @Get()
  paramV4() {
    return 'V4';
  }
}
