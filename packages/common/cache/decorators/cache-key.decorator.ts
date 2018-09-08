import { ReflectMetadata } from '../../decorators';
import { CACHE_KEY_METADATA } from '../cache.constants';

export const CacheKey = (key: string) =>
  ReflectMetadata(CACHE_KEY_METADATA, key);
