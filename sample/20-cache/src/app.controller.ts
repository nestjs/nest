import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { HttpCacheInterceptor } from './common/http-cache.interceptor';

@Controller()
@UseInterceptors(HttpCacheInterceptor)
export class AppController {
  @Get()
  async findAll() {
    // For demonstration purposes, we will simulate a delay
    // to show that the cache is working as expected.
    await new Promise(resolve => setTimeout(resolve, 3000));
    return [{ id: 1, name: 'Nest' }];
  }
}
