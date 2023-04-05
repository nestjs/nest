import { MODULE_OPTIONS_TOKEN } from './cache.module-definition';

/**
 * @deprecated `CacheModule` (from the `@nestjs/common` package) is deprecated and will be removed in the next major release. Please, use the `@nestjs/cache-manager` package instead
 * @publicApi
 */
export const CACHE_MANAGER = 'CACHE_MANAGER';

export const CACHE_KEY_METADATA = 'cache_module:cache_key';
export const CACHE_TTL_METADATA = 'cache_module:cache_ttl';

/**
 * @deprecated `CacheModule` (from the `@nestjs/common` package) is deprecated and will be removed in the next major release. Please, use the `@nestjs/cache-manager` package instead
 * @publicApi
 */
export const CACHE_MODULE_OPTIONS = MODULE_OPTIONS_TOKEN;
