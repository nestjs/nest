import { Controller, Get, Version } from '@nestjs/common';

@Controller('internal-resource')
export class InternalApiController {
  @Get()
  resource() {
    return 'Internal Resource Version 1';
  }

  @Version('2')
  @Get()
  resourceV2() {
    return 'Internal Resource Version 2';
  }
}
