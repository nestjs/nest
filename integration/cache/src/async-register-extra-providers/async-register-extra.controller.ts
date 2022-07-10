import { Controller, Get, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Controller()
export class AsyncRegisterExtraController {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  @Get()
  async getFromStore(): Promise<string> {
    const value: string | undefined = await this.cacheManager.get('key');
    if (!value) {
      await this.cacheManager.set('key', 'value');
    }
    return value ?? 'Not found';
  }
}
