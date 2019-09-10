import { expect } from 'chai';
import { CacheKey, CacheInterceptor, CacheTTL } from '../../cache';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../../cache/cache.constants';
import { UseInterceptors, Controller } from '../../decorators';

describe('@Cache', () => {
  class Metadata {
    @Controller()
    @CacheKey('/a_different_cache_key')
    @CacheTTL(99999)
    @UseInterceptors(CacheInterceptor)
    public static testAll() {}
    @Controller()
    @UseInterceptors(CacheInterceptor)
    @CacheKey('/a_different_cache_key')
    public static testKey() {}
    @Controller()
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(99999)
    public static testTTL() {}
  }

  it('should override global defaults for CacheKey and CacheTTL', () => {
    expect(Reflect.getMetadata(CACHE_KEY_METADATA, Metadata.testAll)).to.be.eql('/a_different_cache_key') &&
    expect(Reflect.getMetadata(CACHE_TTL_METADATA, Metadata.testAll)).to.be.greaterThan(9999);
  });

  it('should override only the TTL', () => {
    expect(Reflect.getMetadata(CACHE_TTL_METADATA, Metadata.testTTL)).to.be.greaterThan(9999);
  });

  it('should override only the Key', () => {
    expect(Reflect.getMetadata(CACHE_KEY_METADATA, Metadata.testKey)).to.be.eql('/a_different_cache_key');
  });
});