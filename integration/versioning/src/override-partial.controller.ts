import { Controller, Get, Version } from '@nestjs/common';

@Controller({
  version: '1'
})
export class OverridePartialController {
  @Get('/override-partial')
  overridePartialV1() {
    return 'Override Partial Version 1';
  }

  @Version('2')
  @Get('/override-partial')
  overridePartialV2() {
    return 'Override Partial Version 2';
  }
}
