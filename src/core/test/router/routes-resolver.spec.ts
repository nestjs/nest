import * as sinon from 'sinon';
import { expect } from 'chai';
import { RoutesResolver } from '../../router/routes-resolver';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { Get } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { ApplicationConfig } from '../../application-config';
import { BadRequestException, Post } from '@nestjs/common';
import { ExpressAdapter } from '../../adapters/express-adapter';

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

  before(() => {
    modules = new Map();
    container = {
      getModules: () => modules,
      getApplicationRef: () => ({
        use: () => ({})
      })
    };
    router = {
      get() {},
      post() {},
    };
  });

  beforeEach(() => {
    routesResolver = new RoutesResolver(
      container,
      new ApplicationConfig(),
    );
  });

  describe('registerRouters', () => {
    it('should method register controllers to router instance', () => {
      const routes = new Map();
      const routeWrapper = {
        instance: new TestRoute(),
        metatype: TestRoute,
      };
      routes.set('TestRoute', routeWrapper);

      const appInstance = new ExpressAdapter(router);
      const exploreSpy = sinon.spy((routesResolver as any).routerBuilder, 'explore');
      const moduleName = '';

      sinon.stub((routesResolver as any).routerBuilder, 'extractRouterPath').callsFake(() => '');
      routesResolver.registerRouters(routes, moduleName, '', appInstance);

      expect(exploreSpy.called).to.be.true;
      expect(exploreSpy.calledWith(
        routeWrapper.instance,
        routeWrapper.metatype,
        moduleName,
        appInstance,
        '',
      )).to.be.true;
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
      routesResolver.resolve({ use: sinon.spy() } as any, { use: sinon.spy() } as any);
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
});
