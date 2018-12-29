import { BadRequestException, Post } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { Get } from '../../../common/decorators/http/request-mapping.decorator';
import { ApplicationConfig } from '../../application-config';
import { RoutesResolver } from '../../router/routes-resolver';
import { NoopHttpAdapter } from '../utils/noop-adapter';

describe('RoutesResolver', () => {
  @Controller('global')
  class TestRoute {
    @Get('test')
    public getTest() {}

    @Post('another-test')
    public anotherTest() {}
  }

  let router;
  let routesResolver: RoutesResolver;
  let container;
  let modules: Map<string, any>;
  let applicationRef;

  before(() => {
    modules = new Map();
    applicationRef = {
      use: () => ({}),
      setNotFoundHandler: sinon.spy(),
      setErrorHandler: sinon.spy(),
    };
    container = {
      getModules: () => modules,
      getApplicationRef: () => applicationRef,
    };
    router = {
      get() {},
      post() {},
    };
  });

  beforeEach(() => {
    routesResolver = new RoutesResolver(container, new ApplicationConfig());
  });

  describe('registerRouters', () => {
    it('should method register controllers to router instance', () => {
      const routes = new Map();
      const routeWrapper = {
        instance: new TestRoute(),
        metatype: TestRoute,
      };
      routes.set('TestRoute', routeWrapper);

      const appInstance = new NoopHttpAdapter(router);
      const exploreSpy = sinon.spy(
        (routesResolver as any).routerBuilder,
        'explore',
      );
      const moduleName = '';

      sinon
        .stub((routesResolver as any).routerBuilder, 'extractRouterPath')
        .callsFake(() => '');
      routesResolver.registerRouters(routes, moduleName, '', appInstance);

      expect(exploreSpy.called).to.be.true;
      expect(
        exploreSpy.calledWith(
          routeWrapper.instance,
          routeWrapper.metatype,
          moduleName,
          appInstance,
          '',
        ),
      ).to.be.true;
    });
  });

  describe('resolve', () => {
    it('should call "registerRouters" for each module', () => {
      const routes = new Map();
      routes.set('TestRoute', {
        instance: new TestRoute(),
        metatype: TestRoute,
      });
      modules.set('TestModule', { routes });
      modules.set('TestModule2', { routes });

      const spy = sinon
        .stub(routesResolver, 'registerRouters')
        .callsFake(() => undefined);
      routesResolver.resolve(
        { use: sinon.spy() } as any,
        { use: sinon.spy() } as any,
      );
      expect(spy.calledTwice).to.be.true;
    });
  });

  describe('mapExternalExceptions', () => {
    describe('when exception prototype is', () => {
      describe('SyntaxError', () => {
        it('should map to BadRequestException', () => {
          const err = new SyntaxError();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).to.be.instanceof(BadRequestException);
        });
      });
      describe('other', () => {
        it('should behave as an identity', () => {
          const err = new Error();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).to.be.eql(err);
        });
      });
    });
  });

  describe('registerNotFoundHandler', () => {
    it('should register not found handler', () => {
      routesResolver.registerNotFoundHandler();

      expect(applicationRef.setNotFoundHandler.called).to.be.true;
    });
  });

  describe('registerExceptionHandler', () => {
    it('should register exception handler', () => {
      const ref = container.getApplicationRef();
      routesResolver.registerExceptionHandler();

      expect(applicationRef.setErrorHandler.called).to.be.true;
    });
  });
});
