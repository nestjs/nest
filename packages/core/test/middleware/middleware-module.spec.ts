import { Injectable, Scope } from '@nestjs/common';
import { RouteInfoPathExtractor } from '@nestjs/core/middleware/route-info-path-extractor';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
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
import { GraphInspector } from '../../inspector/graph-inspector';
import { MiddlewareBuilder } from '../../middleware/builder';
import { MiddlewareContainer } from '../../middleware/container';
import { MiddlewareModule } from '../../middleware/middleware-module';
import { mapToExcludeRoute } from '../../middleware/utils';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

chai.use(chaiAsPromised);

describe('MiddlewareModule', () => {
  let middlewareModule: MiddlewareModule;
  let graphInspector: GraphInspector;

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
    const container = new NestContainer();
    const appConfig = new ApplicationConfig();
    graphInspector = new GraphInspector(container);
    middlewareModule = new MiddlewareModule();
    middlewareModule['routerExceptionFilter'] = new RouterExceptionFilters(
      new NestContainer(),
      appConfig,
      new NoopHttpAdapter({}),
    );
    middlewareModule['routeInfoPathExtractor'] = new RouteInfoPathExtractor(
      appConfig,
    );
    middlewareModule['routerExceptionFilter'] = new RouterExceptionFilters(
      container,
      appConfig,
      new NoopHttpAdapter({}),
    );
    middlewareModule['graphInspector'] = graphInspector;
  });

  describe('loadConfiguration', () => {
    it('should call "configure" method if method is implemented', async () => {
      const stubContainer = new NestContainer();
      stubContainer
        .getModules()
        .set('Test', new Module(class {}, stubContainer));

      const configureSpy = sinon.spy();
      const mockModule = {
        instance: {
          configure: configureSpy,
        },
      };

      (middlewareModule as any).container = stubContainer;
      await middlewareModule.loadConfiguration(
        new MiddlewareContainer(stubContainer),
        mockModule as any,
        'Test',
      );

      expect(configureSpy.calledOnce).to.be.true;
      expect(
        configureSpy.calledWith(
          new MiddlewareBuilder(
            (middlewareModule as any).routesMapper,
            undefined!,
            new RouteInfoPathExtractor(new ApplicationConfig()),
          ),
        ),
      ).to.be.true;
    });
  });

  describe('registerRouteMiddleware', () => {
    class TestModule {}

    let nestContainer: NestContainer;

    beforeEach(() => {
      nestContainer = new NestContainer();
      nestContainer
        .getModules()
        .set('Test', new Module(TestModule, nestContainer));
    });
    it('should throw "RuntimeException" exception when middleware is not stored in container', () => {
      const route = { path: 'Test' };
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: [BaseController],
      };
      const useSpy = sinon.spy();
      const app = { use: useSpy };

      middlewareModule['container'] = nestContainer;

      expect(
        middlewareModule.registerRouteMiddleware(
          new MiddlewareContainer(nestContainer),
          route as any,
          configuration,
          'Test',
          app,
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

      const container = new MiddlewareContainer(nestContainer);
      const moduleKey = 'Test';
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
          app,
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

      const stubContainer = new NestContainer();
      stubContainer
        .getModules()
        .set('Test', new Module(TestModule, stubContainer));

      const container = new MiddlewareContainer(stubContainer);
      const moduleKey = 'Test';
      container.insertConfig([configuration], moduleKey);

      const instance = new TestMiddleware();
      container.getMiddlewareCollection(moduleKey).set(
        TestMiddleware,
        new InstanceWrapper({
          metatype: TestMiddleware,
          instance,
        }),
      );
      sinon
        .stub(stubContainer, 'getModuleByKey')
        .callsFake(() => new Module(class {}, stubContainer));
      middlewareModule['container'] = stubContainer;

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app,
      );
      expect(createMiddlewareFactoryStub.calledOnce).to.be.true;
    });

    it('should mount the middleware on each path, the root path first, and run it once for a request', async () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({ exclude: mapToExcludeRoute(['/']) });
      middlewareModule['routeInfoPathExtractor'] = new RouteInfoPathExtractor(
        appConfig,
      );
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: ['*'],
      };

      const router = sinon.spy();
      const app = {
        createMiddlewareFactory: sinon.stub().resolves(router),
      };

      const stubContainer = new NestContainer();
      const container = new MiddlewareContainer(stubContainer);
      const moduleKey = 'Test';
      stubContainer
        .getModules()
        .set(moduleKey, new Module(TestModule, stubContainer));
      container.insertConfig([configuration], moduleKey);

      const instance = new TestMiddleware();
      const useSpy = sinon.spy(instance, 'use');
      container.getMiddlewareCollection(moduleKey).set(
        TestMiddleware,
        new InstanceWrapper({
          metatype: TestMiddleware,
          instance,
        }),
      );
      middlewareModule['container'] = stubContainer;

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: '*', method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app,
      );
      expect(router.getCalls().map(({ args: [path] }) => path)).to.deep.equal([
        '/',
        '/api$',
        '/api/*',
      ]);

      const req = {};
      const next = sinon.spy();
      for (const {
        args: [, handler],
      } of router.getCalls()) {
        await handler(req, {}, next);
      }
      expect(useSpy.calledOnce).to.be.true;
      expect(next.callCount).to.equal(2);
    });

    it('should mount a transient middleware and the middleware listed after it', async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientMiddleware implements NestMiddleware {
        public use(req, res, next) {}
      }

      @Injectable()
      class AnotherMiddleware implements NestMiddleware {
        public use(req, res, next) {}
      }

      const route = 'testPath';
      const configuration = {
        middleware: [TestMiddleware, TransientMiddleware, AnotherMiddleware],
        forRoutes: ['test'],
      };

      const createMiddlewareFactoryStub = sinon
        .stub()
        .callsFake(() => () => null);
      const app = {
        createMiddlewareFactory: createMiddlewareFactoryStub,
      };

      const stubContainer = new NestContainer();
      stubContainer
        .getModules()
        .set('Test', new Module(TestModule, stubContainer));

      const container = new MiddlewareContainer(stubContainer);
      const moduleKey = 'Test';
      container.insertConfig([configuration], moduleKey);

      const testWrapper = new InstanceWrapper({
        metatype: TestMiddleware,
        instance: new TestMiddleware(),
      });
      const transientWrapper = new InstanceWrapper({
        metatype: TransientMiddleware,
        instance: new TransientMiddleware(),
        scope: Scope.TRANSIENT,
      });
      const anotherWrapper = new InstanceWrapper({
        metatype: AnotherMiddleware,
        instance: new AnotherMiddleware(),
      });
      const collection = container.getMiddlewareCollection(moduleKey);
      collection.set(TestMiddleware, testWrapper);
      collection.set(TransientMiddleware, transientWrapper);
      collection.set(AnotherMiddleware, anotherWrapper);
      sinon
        .stub(stubContainer, 'getModuleByKey')
        .callsFake(() => new Module(class {}, stubContainer));
      middlewareModule['container'] = stubContainer;

      const insertClassNodeSpy = sinon.spy(graphInspector, 'insertClassNode');
      const insertEntrypointDefinitionSpy = sinon.spy(
        graphInspector,
        'insertEntrypointDefinition',
      );

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app,
      );

      expect(createMiddlewareFactoryStub.callCount).to.equal(3);
      expect(
        insertEntrypointDefinitionSpy.getCalls().map(({ args: [, id] }) => id),
      ).to.deep.equal([testWrapper.id, transientWrapper.id, anotherWrapper.id]);
      expect(
        insertClassNodeSpy
          .getCalls()
          .map(({ args: [, wrapper] }) => wrapper.id),
      ).to.deep.equal([testWrapper.id, transientWrapper.id, anotherWrapper.id]);
    });

    it('should insert the expected middleware definition', async () => {
      const route = 'testPath';
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: ['test', BasicController, BaseController],
      };
      const instance = new TestMiddleware();
      const instanceWrapper = new InstanceWrapper({
        metatype: TestMiddleware,
        instance,
        name: TestMiddleware.name,
      });
      const createMiddlewareFactoryStub = sinon
        .stub()
        .callsFake(() => () => null);
      const app = {
        createMiddlewareFactory: createMiddlewareFactoryStub,
      };

      const stubContainer = new NestContainer();
      stubContainer
        .getModules()
        .set('Test', new Module(TestModule, stubContainer));
      const container = new MiddlewareContainer(stubContainer);
      const moduleKey = 'Test';
      container.insertConfig([configuration], moduleKey);
      container
        .getMiddlewareCollection(moduleKey)
        .set(TestMiddleware, instanceWrapper);
      sinon
        .stub(stubContainer, 'getModuleByKey')
        .callsFake(() => new Module(class {}, stubContainer));
      middlewareModule['container'] = stubContainer;

      const insertEntrypointDefinitionSpy = sinon.spy(
        graphInspector,
        'insertEntrypointDefinition',
      );

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app,
      );

      expect(createMiddlewareFactoryStub.calledOnce).to.be.true;
      expect(
        insertEntrypointDefinitionSpy.calledWith({
          type: 'middleware',
          methodName: 'use',
          className: instanceWrapper.name,
          classNodeId: instanceWrapper.id,
          metadata: {
            key: route,
            path: route,
            requestMethod: 'ALL',
            version: undefined,
          } as any,
        }),
      ).to.be.true;
    });
  });
});
