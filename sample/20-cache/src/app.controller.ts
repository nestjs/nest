import {
  CacheInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get()
  findAll() {
    return [{ id: 1, name: 'Nest' }];
  }
}
