import { RequestMethod } from '@nestjs/common';
import { expect } from 'chai';
import { ApplicationConfig } from '../application-config';
import { NestContainer } from '../injector/container';
import { GraphInspector } from '../inspector/graph-inspector';
import { NestApplication } from '../nest-application';
import { mapToExcludeRoute } from './../middleware/utils';
import { NoopHttpAdapter } from './utils/noop-adapter.spec';
import { MicroserviceOptions } from '@nestjs/microservices';
import * as sinon from 'sinon';

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
        new GraphInspector(container),
        {},
      );
      instance.useGlobalInterceptors(new Interceptor());
      const microservice = instance.connectMicroservice<MicroserviceOptions>(
        {},
      );
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
        new GraphInspector(container),
        {},
      );
      instance.useGlobalInterceptors(new Interceptor());
      const microservice = instance.connectMicroservice<MicroserviceOptions>(
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
        new GraphInspector(container),
        {},
      );
      const excludeRoute = ['foo', { path: 'bar', method: RequestMethod.GET }];
      instance.setGlobalPrefix('api', {
        exclude: excludeRoute,
      });
      expect(applicationConfig.getGlobalPrefixOptions()).to.eql({
        exclude: mapToExcludeRoute(excludeRoute),
      });
    });
  });
  describe('Double initialization', () => {
    it('should initialize application only once', async () => {
      const noopHttpAdapter = new NoopHttpAdapter({});
      const httpAdapterSpy = sinon.spy(noopHttpAdapter);

      const applicationConfig = new ApplicationConfig();

      const container = new NestContainer(applicationConfig);
      container.setHttpAdapter(noopHttpAdapter);

      const instance = new NestApplication(
        container,
        noopHttpAdapter,
        applicationConfig,
        new GraphInspector(container),
        {},
      );

      await instance.init();
      await instance.init();

      expect(httpAdapterSpy.init.calledOnce).to.be.true;
    });
  });
});
