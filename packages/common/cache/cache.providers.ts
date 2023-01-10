import { Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';
import { CACHE_MANAGER } from './cache.constants';
import { MODULE_OPTIONS_TOKEN } from './cache.module-definition';
import { defaultCacheOptions } from './default-options';
import {
  CacheManagerOptions,
  CacheStore,
} from './interfaces/cache-manager.interface';

/**
 * Creates a CacheManager Provider.
 *
 * @publicApi
 */
export function createCacheManager(): Provider {
  return {
    provide: CACHE_MANAGER,
    useFactory: async (options: CacheManagerOptions) => {
      const cacheManager = loadPackage('cache-manager', 'CacheModule', () =>
        require('cache-manager'),
      );
      const cacheManagerIsv5OrGreater = 'memoryStore' in cacheManager;
      const cachingFactory = async (
        store: CacheManagerOptions['store'],
        options: Omit<CacheManagerOptions, 'store'>,
      ): Promise<Record<string, any>> => {
        if (!cacheManagerIsv5OrGreater) {
          return cacheManager.caching({
            ...defaultCacheOptions,
            ...{ ...options, store },
          });
        }
        let cache: string | Function | CacheStore = 'memory';
        defaultCacheOptions.ttl *= 1000;
        if (typeof store === 'object') {
          if ('create' in store) {
            cache = store.create;
          } else {
            cache = store;
          }
        } else if (typeof store === 'function') {
          cache = store;
        }
        return cacheManager.caching(cache, {
          ...defaultCacheOptions,
          ...options,
        });
      };

      return Array.isArray(options)
        ? cacheManager.multiCaching(
            await Promise.all(
              options.map(option => cachingFactory(option.store, option)),
            ),
          )
        : cachingFactory(options.store, options);
    },
    inject: [MODULE_OPTIONS_TOKEN],
  };
}
