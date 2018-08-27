import { Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';
import { CACHE_MANAGER, CACHE_MODULE_OPTIONS } from './cache.constants';
import { defaultCacheOptions } from './default-options';
import { CacheManagerOptions } from './interfaces/cache-manager.interface';

export function createCacheManager(): Provider {
  return {
    provide: CACHE_MANAGER,
    useFactory: (options: CacheManagerOptions) => {
      const cacheManager = loadPackage('cache-manager', 'CacheModule');
      const memoryCache = cacheManager.caching({
        ...defaultCacheOptions,
        ...((options || {}) as any),
      });
      return memoryCache;
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}
