import { RequestMethod } from '@nestjs/common';
import { addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import pathToRegexp = require('path-to-regexp');
import { ApplicationConfig } from '../application-config';
import { NestContainer } from '../injector/container';
import { NestApplication } from '../nest-application';
import { NoopHttpAdapter } from './utils/noop-adapter.spec';

describe('NestApplication', () => {
  describe('Hybrid Application', () => {
    class Interceptor {
      public intercept(context, next) {
        return next();
      }
    }
    it('default should use new ApplicationConfig', () => {
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      const instance = new NestApplication(
        container,
        new NoopHttpAdapter({}),
        applicationConfig,
        {},
      );
      instance.useGlobalInterceptors(new Interceptor());
      const microservice = instance.connectMicroservice({});
      expect((instance as any).config.getGlobalInterceptors().length).to.equal(
        1,
      );
      expect(
        (microservice as any).applicationConfig.getGlobalInterceptors().length,
      ).to.equal(0);
    });
    it('should inherit existing ApplicationConfig', () => {
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      const instance = new NestApplication(
        container,
        new NoopHttpAdapter({}),
        applicationConfig,
        {},
      );
      instance.useGlobalInterceptors(new Interceptor());
      const microservice = instance.connectMicroservice(
        {},
        { inheritAppConfig: true },
      );
      expect((instance as any).config.getGlobalInterceptors().length).to.equal(
        1,
      );
      expect(
        (microservice as any).applicationConfig.getGlobalInterceptors().length,
      ).to.equal(1);
    });
  });
  describe('Global Prefix', () => {
    it('should get correct global prefix options', () => {
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      const instance = new NestApplication(
        container,
        new NoopHttpAdapter({}),
        applicationConfig,
        {},
      );
      instance.setGlobalPrefix('api', {
        exclude: ['foo', { path: 'bar', method: RequestMethod.GET }],
      });
      expect((instance as any).config.getGlobalPrefixOptions()).to.eql({
        exclude: [
          {
            path: 'foo',
            requestMethod: RequestMethod.ALL,
            pathRegex: pathToRegexp(addLeadingSlash('foo')),
          },
          {
            path: 'bar',
            requestMethod: RequestMethod.GET,
            pathRegex: pathToRegexp(addLeadingSlash('bar')),
          },
        ],
      });
    });
  });
});
