import { expect } from 'chai';
import { CacheKey, CacheInterceptor, CacheTTL } from '../../cache';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../../cache/cache.constants';
import { UseInterceptors } from '../../decorators';
import { Controller } from '../../decorators/core/controller.decorator';

describe('@Cache', () => {
  @Controller('test')
  @CacheKey('/a_different_cache_key')
  @CacheTTL(99999)
  @UseInterceptors(CacheInterceptor)
  class TestAll {}

  @Controller()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('/a_different_cache_key')
  class TestKey {}

  @Controller()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(99999)
  class TestTTL {}

  it('should override global defaults for CacheKey and CacheTTL', () => {
    expect(Reflect.getMetadata(CACHE_KEY_METADATA, TestAll)).to.be.eql(
      '/a_different_cache_key',
    );
    expect(Reflect.getMetadata(CACHE_TTL_METADATA, TestAll)).to.be.greaterThan(
      9999,
    );
  });

  it('should override only the TTL', () => {
    expect(Reflect.getMetadata(CACHE_TTL_METADATA, TestTTL)).to.be.greaterThan(
      9999,
    );
  });

  it('should override only the Key', () => {
    expect(Reflect.getMetadata(CACHE_KEY_METADATA, TestKey)).to.be.eql(
      '/a_different_cache_key',
    );
  });
});
