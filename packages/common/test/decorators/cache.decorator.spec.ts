import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import {
  CacheKey,
  CacheInterceptor,
  CacheTTL,
  CacheModule,
  CacheMethod,
} from '../../cache';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../../cache/cache.constants';
import { Injectable, Module, UseInterceptors } from '../../decorators';
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

  describe('CacheMethod', () => {
    @Injectable()
    class TestService {
      @CacheMethod()
      async findOne(name: string): Promise<{ name: string; now: number }> {
        return new Promise(resolve => {
          resolve({ name, now: Date.now() });
        });
      }
    }

    let testService: TestService;
    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [CacheModule.register()],
        providers: [TestService],
      }).compile();
      const app = moduleFixture.createNestApplication();
      testService = app.get<TestService>(TestService);
    });

    it('should be used cache for the same request', async () => {
      const first = await testService.findOne('test');
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 10));
        const cached = await testService.findOne('test');
        expect(cached.now).equal(first.now);

        const newRequest = await testService.findOne(`test-${i}`);
        expect(newRequest.now).not.equal(first.now);
      }
    });
  });
});
