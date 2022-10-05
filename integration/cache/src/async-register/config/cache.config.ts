import {
  CacheModuleOptions,
  CacheOptionsFactory,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class CacheConfig implements CacheOptionsFactory {
  createCacheOptions(): CacheModuleOptions {
    const ttl = 100;

    return { ttl };
  }
}
