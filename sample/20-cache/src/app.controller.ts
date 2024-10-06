import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { HttpCacheInterceptor } from './common/http-cache.interceptor';

@Controller()
@UseInterceptors(HttpCacheInterceptor)
export class AppController {
  @Get()
  findAll() {
    return [{ id: 1, name: 'Nest' }];
  }
}
