import { CacheInterceptor } from './cache.interceptor';
import { mixin } from '';

export function mixinCacheInterceptor(isCached: () => boolean) {
  return mixin(class extends CacheInterceptor {
    protected readonly isCached = isCached;
  });
}
