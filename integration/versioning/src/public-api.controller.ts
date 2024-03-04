import { Controller, Get, Version } from '@nestjs/common';

@Controller('public-resource')
export class PublicApiController {
  @Get()
  resource() {
    return 'Public Resource Version 1';
  }

  @Version('2')
  @Get()
  resourceV2() {
    return 'Public Resource Version 2';
  }
}
