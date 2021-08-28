import { RequestMethod } from '@nestjs/common';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces';
import { ApplicationConfig } from '../application-config';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';

describe('ApplicationConfig', () => {
  let appConfig: ApplicationConfig;

  beforeEach(() => {
    appConfig = new ApplicationConfig();
  });
  describe('globalPath', () => {
    it('should set global path', () => {
      const path = 'test';
      appConfig.setGlobalPrefix(path);

      expect(appConfig.getGlobalPrefix()).toEqual(path);
    });
    it('should set global path options', () => {
      const options: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          { pathRegex: new RegExp(/health/), requestMethod: RequestMethod.GET },
        ],
      };
      appConfig.setGlobalPrefixOptions(options);

      expect(appConfig.getGlobalPrefixOptions()).toEqual(options);
    });
    it('should has empty string as a global path by default', () => {
      expect(appConfig.getGlobalPrefix()).toEqual('');
    });
    it('should has empty string as a global path option by default', () => {
      expect(appConfig.getGlobalPrefixOptions()).toEqual({});
    });
  });
  describe('IOAdapter', () => {
    it('should set io adapter', () => {
      const ioAdapter = { test: 0 };
      appConfig.setIoAdapter(ioAdapter as any);

      expect(appConfig.getIoAdapter()).toEqual(ioAdapter);
    });
  });
  describe('Pipes', () => {
    it('should set global pipes', () => {
      const pipes = ['test', 'test2'];
      appConfig.useGlobalPipes(...(pipes as any));

      expect(appConfig.getGlobalPipes()).toEqual(pipes);
    });
    it('should add pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalPipe(pipe as any);

      expect(appConfig.getGlobalPipes()).toEqual(
        expect.arrayContaining([pipe]),
      );
    });
    it('should add global pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalRequestPipe(pipe as any);

      expect(appConfig.getGlobalRequestPipes()).toEqual(
        expect.arrayContaining([pipe]),
      );
    });
  });
  describe('Filters', () => {
    it('should set global filters', () => {
      const filters = ['test', 'test2'];
      appConfig.useGlobalFilters(...(filters as any));

      expect(appConfig.getGlobalFilters()).toEqual(filters);
    });
    it('should add filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalFilter(filter as any);

      expect(appConfig.getGlobalFilters()).toEqual(
        expect.arrayContaining([filter]),
      );
    });
    it('should add request filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalRequestFilter(filter as any);

      expect(appConfig.getGlobalRequestFilters()).toEqual(
        expect.arrayContaining([filter]),
      );
    });
  });
  describe('Guards', () => {
    it('should set global guards', () => {
      const guards = ['test', 'test2'];
      appConfig.useGlobalGuards(...(guards as any));

      expect(appConfig.getGlobalGuards()).toEqual(guards);
    });
    it('should add guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalGuard(guard as any);

      expect(appConfig.getGlobalGuards()).toEqual(
        expect.arrayContaining([guard]),
      );
    });
    it('should add request guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalRequestGuard(guard as any);

      expect(appConfig.getGlobalRequestGuards()).toEqual(
        expect.arrayContaining([guard]),
      );
    });
  });
  describe('Interceptors', () => {
    it('should set global interceptors', () => {
      const interceptors = ['test', 'test2'];
      appConfig.useGlobalInterceptors(...(interceptors as any));

      expect(appConfig.getGlobalInterceptors()).toEqual(interceptors);
    });
    it('should add interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalInterceptor(interceptor as any);

      expect(appConfig.getGlobalInterceptors()).toEqual(
        expect.arrayContaining([interceptor]),
      );
    });
    it('should add request interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalRequestInterceptor(interceptor as any);

      expect(appConfig.getGlobalRequestInterceptors()).toEqual(
        expect.arrayContaining([interceptor]),
      );
    });
  });
  describe('Versioning', () => {
    it('should set versioning', () => {
      const options = { type: 'test' };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()).toEqual(options);
    });

    it('should have undefined as the versioning by default', () => {
      expect(appConfig.getVersioning()).toEqual(undefined);
    });
  });
});
