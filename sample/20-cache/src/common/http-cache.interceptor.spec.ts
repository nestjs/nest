import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpCacheInterceptor } from './http-cache.interceptor';

describe('HttpCacheInterceptor', () => {
  let interceptor: HttpCacheInterceptor;

  const mockHttpAdapter = {
    getRequestMethod: jest.fn(),
    getRequestUrl: jest.fn(),
  };

  const createMockContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpCacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: new Reflector(),
        },
        {
          provide: HttpAdapterHost,
          useValue: { httpAdapter: mockHttpAdapter },
        },
      ],
    }).compile();

    interceptor = module.get<HttpCacheInterceptor>(HttpCacheInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('trackBy', () => {
    it('should return the request URL for GET requests', () => {
      mockHttpAdapter.getRequestMethod.mockReturnValue('GET');
      mockHttpAdapter.getRequestUrl.mockReturnValue('/');

      const result = interceptor.trackBy(createMockContext());

      expect(result).toBe('/');
    });

    it('should return undefined for POST requests', () => {
      mockHttpAdapter.getRequestMethod.mockReturnValue('POST');
      mockHttpAdapter.getRequestUrl.mockReturnValue('/');

      const result = interceptor.trackBy(createMockContext());

      expect(result).toBeUndefined();
    });

    it('should return undefined for PUT requests', () => {
      mockHttpAdapter.getRequestMethod.mockReturnValue('PUT');
      mockHttpAdapter.getRequestUrl.mockReturnValue('/resource');

      const result = interceptor.trackBy(createMockContext());

      expect(result).toBeUndefined();
    });

    it('should return undefined for DELETE requests', () => {
      mockHttpAdapter.getRequestMethod.mockReturnValue('DELETE');
      mockHttpAdapter.getRequestUrl.mockReturnValue('/resource/1');

      const result = interceptor.trackBy(createMockContext());

      expect(result).toBeUndefined();
    });

    it('should return different URLs for different GET paths', () => {
      mockHttpAdapter.getRequestMethod.mockReturnValue('GET');
      mockHttpAdapter.getRequestUrl.mockReturnValue('/api/items');

      const result = interceptor.trackBy(createMockContext());

      expect(result).toBe('/api/items');
    });
  });
});
