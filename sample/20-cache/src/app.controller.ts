import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get()
  async findAll() {
    // For demonstration purposes, we will simulate a delay
    // to show that the cache is working as expected.
    await new Promise(resolve => setTimeout(resolve, 3000));
    return [{ id: 1, name: 'Nest' }];
  }
}
