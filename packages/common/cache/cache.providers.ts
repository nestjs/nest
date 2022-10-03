import { Provider } from '../interfaces';
import { loadPackage } from '../utils/load-package.util';
import { CACHE_MANAGER } from './cache.constants';
import { MODULE_OPTIONS_TOKEN } from './cache.module-definition';
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cmVersion = require('cache-manager/package.json').version;
      const cmMajor = cmVersion.split('.')[0];
      const cachingFactory = (
        store: CacheManagerOptions['store'],
        options: Omit<CacheManagerOptions, 'store'>,
      ): Record<string, any> => {
        if (cmMajor < 5) {
          return cacheManager.caching({
            ...defaultCacheOptions,
            ...{ ...options, store },
          });
        }
        return cacheManager.caching(store ?? 'memory', options);
      };

      return Array.isArray(options)
        ? cacheManager.multiCaching(
            options.map(option => cachingFactory(options.store, option)),
          )
        : cachingFactory(options.store, options);
    },
    inject: [MODULE_OPTIONS_TOKEN],
  };
}
