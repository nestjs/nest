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

    it('should immediately initialize microservice by default', () => {
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

    it('should defer microservice initialization when deferInitialization is true', () => {
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
  describe('useWebSocketAdapter', () => {
    function createInstance(): NestApplication {
      const noopHttpAdapter = new NoopHttpAdapter({});
      const applicationConfig = new ApplicationConfig();
      const container = new NestContainer(applicationConfig);
      container.setHttpAdapter(noopHttpAdapter);
      return new NestApplication(
        container,
        noopHttpAdapter,
        applicationConfig,
        new GraphInspector(container),
        {},
      );
    }

    it('should not warn when called before WS module registration', () => {
      const instance = createInstance();
      const warnSpy = sinon.spy((instance as any).logger, 'warn');

      instance.useWebSocketAdapter({} as any);

      expect(warnSpy.called).to.be.false;
    });

    it('should warn when called after WS module registration', () => {
      const instance = createInstance();
      instance.registerWsModule();
      const warnSpy = sinon.spy((instance as any).logger, 'warn');

      instance.useWebSocketAdapter({} as any);

      expect(warnSpy.calledOnce).to.be.true;
      expect(warnSpy.firstCall.args[0]).to.match(
        /useWebSocketAdapter\(\) was called after WebSocket gateways were already initialized/,
      );
    });

    it('should still set the adapter on ApplicationConfig even when called too late', () => {
      const instance = createInstance();
      instance.registerWsModule();
      const adapter = { create: () => undefined } as any;

      instance.useWebSocketAdapter(adapter);

      expect((instance as any).config.getIoAdapter()).to.equal(adapter);
    });
  });
});
