import { SetMetadata } from '../../decorators';
import { CACHE_KEY_METADATA } from '../cache.constants';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
