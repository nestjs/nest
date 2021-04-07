import { BadRequestException, Module, Post } from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { Controller } from '../../../common/decorators/core/controller.decorator';
import { Get } from '../../../common/decorators/http/request-mapping.decorator';
import { ApplicationConfig } from '../../application-config';
import { NestContainer } from '../../injector';
import { Injector } from '../../injector/injector';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { RoutesResolver } from '../../router/routes-resolver';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RoutesResolver', () => {
  @Controller('global')
  class TestRoute {
    @Get('test')
    public getTest() {}

    @Post('another-test')
    public anotherTest() {}
  }

  @Controller({ host: 'api.example.com' })
  class TestHostRoute {
    @Get()
    public getTest() {}
  }

  @Module({
    controllers: [TestRoute],
  })
  class TestModule {}

  @Module({
    controllers: [TestRoute],
  })
  class TestModule2 {}

  let router: any;
  let routesResolver: RoutesResolver;
  let container: NestContainer;
  let modules: Map<string, any>;
  let applicationRef: any;

  beforeEach(() => {
    modules = new Map();
    applicationRef = {
      use: () => ({}),
      setNotFoundHandler: sinon.spy(),
      setErrorHandler: sinon.spy(),
    } as any;
    container = {
      getModules: () => modules,
      getModuleByKey: (key: string) => modules.get(key),
      getHttpAdapterRef: () => applicationRef,
    } as any;
    router = {
      get() {},
      post() {},
    };
  });

  beforeEach(() => {
    routesResolver = new RoutesResolver(
      container,
      new ApplicationConfig(),
      new Injector(),
    );
  });

  describe('registerRouters', () => {
    it('should register controllers to router instance', () => {
      const routes = new Map();
      const routeWrapper = new InstanceWrapper({
        instance: new TestRoute(),
        metatype: TestRoute,
      });
      routes.set('TestRoute', routeWrapper);

      const appInstance = new NoopHttpAdapter(router);
      const exploreSpy = sinon.spy(
        (routesResolver as any).routerExplorer,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      sinon
        .stub((routesResolver as any).routerExplorer, 'extractRouterPath')
        .callsFake(() => ['']);
      routesResolver.registerRouters(routes, moduleName, '', appInstance);

      expect(exploreSpy.called).to.be.true;
      expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, ''))
        .to.be.true;
    });

    it('should register with host when specified', () => {
      const routes = new Map();
      const routeWrapper = new InstanceWrapper({
        instance: new TestHostRoute(),
        metatype: TestHostRoute,
      });
      routes.set('TestHostRoute', routeWrapper);

      const appInstance = new NoopHttpAdapter(router);
      const exploreSpy = sinon.spy(
        (routesResolver as any).routerExplorer,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      sinon
        .stub((routesResolver as any).routerExplorer, 'extractRouterPath')
        .callsFake(() => ['']);
      routesResolver.registerRouters(routes, moduleName, '', appInstance);

      expect(exploreSpy.called).to.be.true;
      expect(
        exploreSpy.calledWith(
          routeWrapper,
          moduleName,
          appInstance,
          '',
          'api.example.com',
        ),
      ).to.be.true;
    });
  });

  describe('resolve', () => {
    it('should call "registerRouters" for each module', () => {
      const routes = new Map();
      routes.set(
        'TestRoute',
        new InstanceWrapper({
          instance: new TestRoute(),
          metatype: TestRoute,
        }),
      );
      modules.set('TestModule', { routes });
      modules.set('TestModule2', { routes });

      const registerRoutersStub = sinon
        .stub(routesResolver, 'registerRouters')
        .callsFake(() => undefined);

      routesResolver.resolve({ use: sinon.spy() } as any, 'basePath');
      expect(registerRoutersStub.calledTwice).to.be.true;
    });

    describe('registerRouters', () => {
      it('should register each module with the base path and append the module path if present ', () => {
        const routes = new Map();
        routes.set('TestRoute', {
          instance: new TestRoute(),
          metatype: TestRoute,
        });

        Reflect.defineMetadata(MODULE_PATH, '/test', TestModule);
        modules.set('TestModule', { routes, metatype: TestModule });
        modules.set('TestModule2', { routes, metatype: TestModule2 });

        const spy = sinon
          .stub(routesResolver, 'registerRouters')
          .callsFake(() => undefined);

        routesResolver.resolve(applicationRef, 'api/v1');

        // with module path
        expect(
          spy
            .getCall(0)
            .calledWith(
              sinon.match.any,
              sinon.match.any,
              'api/v1/test',
              sinon.match.any,
            ),
        ).to.be.true;
        // without module path
        expect(
          spy
            .getCall(1)
            .calledWith(
              sinon.match.any,
              sinon.match.any,
              'api/v1',
              sinon.match.any,
            ),
        ).to.be.true;
      });

      it('should register each module with the module path if present', () => {
        const routes = new Map();
        routes.set('TestRoute', {
          instance: new TestRoute(),
          metatype: TestRoute,
        });

        Reflect.defineMetadata(MODULE_PATH, '/test', TestModule);
        modules.set('TestModule', { routes, metatype: TestModule });
        modules.set('TestModule2', { routes, metatype: TestModule2 });

        const spy = sinon
          .stub(routesResolver, 'registerRouters')
          .callsFake(() => undefined);

        routesResolver.resolve(applicationRef, '');

        // with module path
        expect(
          spy
            .getCall(0)
            .calledWith(
              sinon.match.any,
              sinon.match.any,
              '/test',
              sinon.match.any,
            ),
        ).to.be.true;
        // without module path
        expect(
          spy
            .getCall(1)
            .calledWith(sinon.match.any, sinon.match.any, '', sinon.match.any),
        ).to.be.true;
      });
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
      routesResolver.registerExceptionHandler();

      expect(applicationRef.setErrorHandler.called).to.be.true;
    });
  });
});
