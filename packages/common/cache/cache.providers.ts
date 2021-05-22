import { Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';
import { CACHE_MANAGER, CACHE_MODULE_OPTIONS } from './cache.constants';
import { defaultCacheOptions } from './default-options';
import { CacheManagerOptions } from './interfaces/cache-manager.interface';

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

      return Array.isArray(options)
        ? cacheManager.multiCaching(
          options.map(store => cacheManager.caching({
              ...defaultCacheOptions,
              ...(store || {}),
            })
          )
        )
        : cacheManager.caching({
          ...defaultCacheOptions,
          ...(options || {}),
        });
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}
