import { CACHE_MANAGER } from '../';
import { Inject } from '../../decorators';
import { Cache } from 'cache-manager';

/**
 * Cache Method Decorator that manage per method name and arguments
 *
 * For example:
 * `@CacheMethod()`
 *
 * @param {object} options configuration object specifying:
 * - `key` - string naming the field to be used as a cache key
 * - `ttl` - number set the cache expiration time
 *
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @publicApi
 */
export const CacheMethod = (opts?: { key?: string; ttl?: number }) => {
  const injector = Inject(CACHE_MANAGER);

  return (
    target: Object,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    injector(target, 'cacheManager');

    if (!descriptor) {
      return;
    }

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = [key, opts?.key, ...args].filter(Boolean).join(':');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const cacheManager = this.cacheManager as Cache;
      const store = await cacheManager.get(cacheKey);

      if (store) {
        return store;
      }
      const value = await originalMethod.apply(this, args);
      if (value) {
        await cacheManager.set(cacheKey, value, opts?.ttl);
      }
      return value;
    };

    return descriptor;
  };
};
