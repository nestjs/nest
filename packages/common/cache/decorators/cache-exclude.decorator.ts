import { SetMetadata } from "../../decorators";
import { CACHE_EXCLUDE_METADATA } from "../cache.constants";

/**
 * Decorator that will exclude the controller or endpoint from being cached
 *
 * For example: 
 * `@CacheExclude()`
 * 
 * @param exclude boolean whether or not to exclude the cache, `true` by default.
 * 
 * @see [Caching](https://docs.nestjs.com/techniques/caching)
 *
 * @publicApi
 */
export const CacheExclude = (exclude = true) =>
  SetMetadata(CACHE_EXCLUDE_METADATA, exclude);