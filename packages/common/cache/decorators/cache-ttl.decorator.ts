import { SetMetadata } from '../../decorators';
import { ExecutionContext } from '../../interfaces/features/execution-context.interface';
import { CACHE_TTL_METADATA } from '../cache.constants';

/**
 * Decorator that sets the cache ttl setting the duration for cache expiration.
 *
 * For example: `@CacheTTL(5)`
 *
 * @param ttl number set the cache expiration time
 *
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @deprecated `CacheModule` (from the `@nestjs/common` package) is deprecated and will be removed in the next major release. Please, use the `@nestjs/cache-manager` package instead
 * @publicApi
 */
type CacheTTLFactory = (ctx: ExecutionContext) => Promise<number> | number;
export const CacheTTL = (ttl: number | CacheTTLFactory) =>
  SetMetadata(CACHE_TTL_METADATA, ttl);
