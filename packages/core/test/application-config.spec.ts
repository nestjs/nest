import { expect } from 'chai';
import { ApplicationConfig, GlobalPrefixConfig } from '../application-config';
import { RequestMethod } from '@nestjs/common';

describe('ApplicationConfig', () => {
  let appConfig: ApplicationConfig;

  beforeEach(() => {
    appConfig = new ApplicationConfig();
  });
  describe('globalPrefix', () => {
    it('should set global prefix', () => {
      const path = 'test';
      appConfig.setGlobalPrefix(path);

      expect(appConfig.getGlobalPrefix()).to.be.eql(path);
    });
    it('should has empty string as a global prefix by default', () => {
      expect(appConfig.getGlobalPrefix()).to.be.eql('');
    });
  });
  describe('globalPrefixConfig', () => {
    it('should set global prefix config', () => {
      const globalPrefixConfig: GlobalPrefixConfig = {
        exclude: [
          {
            path: '/health',
            method: RequestMethod.GET,
          },
        ],
      };
      appConfig.setGlobalPrefixConfig(globalPrefixConfig);
      expect(appConfig.getGlobalPrefixConfig()).to.be.eql(globalPrefixConfig);
    });
    it('should has be empty array as a global prefix exclude by default', () => {
      expect(appConfig.getGlobalPrefixConfig()).to.be.eql({ exclude: [] });
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
  });
});
