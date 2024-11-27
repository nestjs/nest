import { RequestMethod } from '@nestjs/common';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces';
import { expect } from 'chai';
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

      expect(appConfig.getGlobalPrefix()).to.be.eql(path);
    });
    it('should set global path options', () => {
      const options: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          {
            path: '/health',
            pathRegex: new RegExp(/health/),
            requestMethod: RequestMethod.GET,
          },
        ],
      };
      appConfig.setGlobalPrefixOptions(options);

      expect(appConfig.getGlobalPrefixOptions()).to.be.eql(options);
    });
    it('should has empty string as a global path by default', () => {
      expect(appConfig.getGlobalPrefix()).to.be.eql('');
    });
    it('should has empty string as a global path option by default', () => {
      expect(appConfig.getGlobalPrefixOptions()).to.be.eql({});
    });
  });
  describe('IOAdapter', () => {
    it('should set io adapter', () => {
      const ioAdapter = { test: 0 };
      appConfig.setIoAdapter(ioAdapter as any);

      expect(appConfig.getIoAdapter()).to.be.eql(ioAdapter);
    });
  });
  describe('Pipes', () => {
    it('should set global pipes', () => {
      const pipes = ['test', 'test2'];
      appConfig.useGlobalPipes(...(pipes as any));

      expect(appConfig.getGlobalPipes()).to.be.eql(pipes);
    });
    it('should add pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalPipe(pipe as any);

      expect(appConfig.getGlobalPipes()).to.contain(pipe);
    });
    it('should add global pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalRequestPipe(pipe as any);

      expect(appConfig.getGlobalRequestPipes()).to.contain(pipe);
    });
  });
  describe('Filters', () => {
    it('should set global filters', () => {
      const filters = ['test', 'test2'];
      appConfig.useGlobalFilters(...(filters as any));

      expect(appConfig.getGlobalFilters()).to.be.eql(filters);
    });
    it('should add filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalFilter(filter as any);

      expect(appConfig.getGlobalFilters()).to.contain(filter);
    });
    it('should add request filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalRequestFilter(filter as any);

      expect(appConfig.getGlobalRequestFilters()).to.contain(filter);
    });
  });
  describe('Guards', () => {
    it('should set global guards', () => {
      const guards = ['test', 'test2'];
      appConfig.useGlobalGuards(...(guards as any));

      expect(appConfig.getGlobalGuards()).to.be.eql(guards);
    });
    it('should add guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalGuard(guard as any);

      expect(appConfig.getGlobalGuards()).to.contain(guard);
    });
    it('should add request guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalRequestGuard(guard as any);

      expect(appConfig.getGlobalRequestGuards()).to.contain(guard);
    });
  });
  describe('Interceptors', () => {
    it('should set global interceptors', () => {
      const interceptors = ['test', 'test2'];
      appConfig.useGlobalInterceptors(...(interceptors as any));

      expect(appConfig.getGlobalInterceptors()).to.be.eql(interceptors);
    });
    it('should add interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalInterceptor(interceptor as any);

      expect(appConfig.getGlobalInterceptors()).to.contain(interceptor);
    });
    it('should add request interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalRequestInterceptor(interceptor as any);

      expect(appConfig.getGlobalRequestInterceptors()).to.contain(interceptor);
    });
  });
  describe('Versioning', () => {
    it('should set versioning', () => {
      const options = { type: 'test' };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()).to.be.eql(options);
    });

    it('should ignore duplicated versions on defaultVersion array', () => {
      const options = { type: 'test', defaultVersion: ['1', '2', '2', '1'] };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()!.defaultVersion).to.be.eql(['1', '2']);
    });

    it('should have undefined as the versioning by default', () => {
      expect(appConfig.getVersioning()).to.be.eql(undefined);
    });
  });
});
