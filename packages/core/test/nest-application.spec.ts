import { RequestMethod } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util.js';
import { MicroserviceOptions } from '@nestjs/microservices';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../application-config.js';
import { NestContainer } from '../injector/container.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import { NestApplication } from '../nest-application.js';
import { mapToExcludeRoute } from './../middleware/utils.js';
import { NoopHttpAdapter } from './utils/noop-adapter.spec.js';

describe('NestApplication', () => {
  before(async () => {
    // Pre-populate the package cache so that connectMicroservice()
    // can synchronously retrieve @nestjs/microservices via loadPackageCached.
    await loadPackage(
      '@nestjs/microservices',
      'NestApplication tests',
      () => import('@nestjs/microservices'),
    );
  });

  describe('Hybrid Application', () => {
    class Interceptor {
      public intercept(context, next) {
        return next();
      }
    }
    it('default should use new ApplicationConfig', async () => {
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
    it('should inherit existing ApplicationConfig', async () => {
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

    it('should immediately initialize microservice by default', async () => {
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      const instance = new NestApplication(
        container,
        new NoopHttpAdapter({}),
        applicationConfig,
        new GraphInspector(container),
        {},
      );

      const microservice = instance.connectMicroservice<MicroserviceOptions>(
        {},
        {},
      );

      expect((microservice as any).isInitialized).to.be.true;
      expect((microservice as any).wasInitHookCalled).to.be.true;
    });

    it('should defer microservice initialization when deferInitialization is true', async () => {
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      const instance = new NestApplication(
        container,
        new NoopHttpAdapter({}),
        applicationConfig,
        new GraphInspector(container),
        {},
      );

      const microservice = instance.connectMicroservice<MicroserviceOptions>(
        {},
        { deferInitialization: true },
      );

      expect((microservice as any).isInitialized).to.be.false;
      expect((microservice as any).wasInitHookCalled).to.be.false;
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
