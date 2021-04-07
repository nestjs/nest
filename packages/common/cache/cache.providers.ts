import { Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';

import { CacheManagerOptions } from './interfaces/cache-manager.interface';
import { CACHE_MANAGER, CACHE_MODULE_OPTIONS } from './cache.constants';
import { defaultCacheOptions } from './default-options';

/**
 * Creates a CacheManager Provider.
 *
 * @publicApi
 */
export function createCacheManager(): Provider {
  return {
    provide: CACHE_MANAGER,
    useFactory: (options: CacheManagerOptions) => {
      const cacheManager = loadPackage('cache-manager', 'CacheModule', () =>
        require('cache-manager'),
      );
      const memoryCache = cacheManager.caching({
        ...defaultCacheOptions,
        ...(options || {}),
      });
      return memoryCache;
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}
