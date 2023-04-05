import {
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

@Controller()
export class CustomTtlController {
  counter = 0;
  constructor() {}

  @Get()
  @CacheTTL(500)
  @UseInterceptors(CacheInterceptor)
  getNumber() {
    return this.counter++;
  }
}
