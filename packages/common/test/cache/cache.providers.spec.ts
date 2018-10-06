import { expect } from 'chai';
import {
  CACHE_MANAGER,
  CACHE_MODULE_OPTIONS,
} from '../../cache/cache.constants';
import { createCacheManager } from '../../cache/cache.providers';

describe('createCacheManager', () => {
  it('should create provider', () => {
    const cacheManager: any = createCacheManager();

    expect(cacheManager.provide).to.be.eql(CACHE_MANAGER);
    expect(cacheManager.inject).to.contain(CACHE_MODULE_OPTIONS);
  });

  it('should create cache manager', () => {
    const cacheManager: any = createCacheManager();
    const manager = cacheManager.useFactory({});

    expect(manager).to.be.an('object');
  });
});
