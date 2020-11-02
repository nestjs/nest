import { SetMetadata } from '../../decorators';
import { CACHE_TTL_METADATA } from '../cache.constants';
import { ExecutionContext } from '../../interfaces/features/execution-context.interface';

/**
 * Decorator that sets the cache ttl setting the duration for cache expiration.
 *
 * For example: `@CacheTTL(5)`
 *
 * @param ttl number set the cache expiration time
 *
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @publicApi
 */
type CacheTTLHandler<T> = (ctx: T) => Promise<number> | number;
export const CacheTTL = (ttl: number | CacheTTLHandler<ExecutionContext>) =>
  SetMetadata(CACHE_TTL_METADATA, ttl);
