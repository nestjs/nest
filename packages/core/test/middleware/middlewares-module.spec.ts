import { Injectable } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { ApplicationConfig } from '../../application-config';
import { InvalidMiddlewareException } from '../../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';
import { MiddlewareBuilder } from '../../middleware/builder';
import { MiddlewareContainer } from '../../middleware/container';
import { MiddlewareModule } from '../../middleware/middleware-module';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('MiddlewareModule', () => {
  let middlewareModule: MiddlewareModule;

  @Controller('test')
  class BasicController {}

  @Controller('test')
  class BaseController {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  @Injectable()
  class TestMiddleware implements NestMiddleware {
    public use(req, res, next) {}
  }

  beforeEach(() => {
    const appConfig = new ApplicationConfig();
    middlewareModule = new MiddlewareModule();
    (middlewareModule as any).routerExceptionFilter = new RouterExceptionFilters(
      new NestContainer(),
      appConfig,
      new NoopHttpAdapter({}),
    );
    (middlewareModule as any).config = appConfig;
  });

  describe('loadConfiguration', () => {
    it('should call "configure" method if method is implemented', async () => {
      const configureSpy = sinon.spy();
      const mockModule = {
        configure: configureSpy,
      };

      await middlewareModule.loadConfiguration(
        new MiddlewareContainer(),
        mockModule as any,
        'Test' as any,
      );

      expect(configureSpy.calledOnce).to.be.true;
      expect(
        configureSpy.calledWith(
          new MiddlewareBuilder((middlewareModule as any).routesMapper),
        ),
      ).to.be.true;
    });
  });

  describe('registerRouteMiddleware', () => {
    it('should throw "RuntimeException" exception when middleware is not stored in container', () => {
      const route = { path: 'Test' };
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: [BaseController],
      };

      const useSpy = sinon.spy();
      const app = { use: useSpy };

      const nestContainer = new NestContainer();
      // tslint:disable-next-line:no-string-literal
      middlewareModule['container'] = nestContainer;

      expect(
        middlewareModule.registerRouteMiddleware(
          new MiddlewareContainer(),
          route as any,
          configuration,
          'Test' as any,
          app as any,
        ),
      ).to.eventually.be.rejectedWith(RuntimeException);
    });

    it('should throw "InvalidMiddlewareException" exception when middleware does not have "use" method', () => {
      @Injectable()
      class InvalidMiddleware {}

      const route = { path: 'Test' };
      const configuration = {
        middleware: [InvalidMiddleware],
        forRoutes: [BaseController],
      };

      const useSpy = sinon.spy();
      const app = { use: useSpy };

      const container = new MiddlewareContainer();
      const moduleKey = 'Test' as any;
      container.insertConfig([configuration], moduleKey);

      const instance = new InvalidMiddleware();
      container.getMiddlewareCollection(moduleKey).set('InvalidMiddleware', {
        metatype: InvalidMiddleware,
        instance,
      } as any);

      expect(
        middlewareModule.registerRouteMiddleware(
          container,
          route as any,
          configuration,
          moduleKey,
          app as any,
        ),
      ).to.be.rejectedWith(InvalidMiddlewareException);
    });

    it('should mount middleware when is stored in container', async () => {
      const route = 'testPath';
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: ['test', BasicController, BaseController],
      };

      const createMiddlewareFactoryStub = sinon
        .stub()
        .callsFake(() => () => null);
      const app = {
        createMiddlewareFactory: createMiddlewareFactoryStub,
      };
      const container = new MiddlewareContainer();
      const moduleKey = 'Test';
      container.insertConfig([configuration], moduleKey);

      const instance = new TestMiddleware();
      container.getMiddlewareCollection(moduleKey).set(
        'TestMiddleware',
        new InstanceWrapper({
          metatype: TestMiddleware,
          instance,
        }),
      );
      const nestContainer = new NestContainer();
      sinon
        .stub(nestContainer, 'getModuleByKey')
        .callsFake(() => new Module(class {}, [], nestContainer));
      // tslint:disable-next-line:no-string-literal
      middlewareModule['container'] = nestContainer;

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app as any,
      );
      expect(createMiddlewareFactoryStub.calledOnce).to.be.true;
    });
  });
});
