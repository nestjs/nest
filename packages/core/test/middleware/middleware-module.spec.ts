import { Injectable } from '@nestjs/common';
import { RouteInfoPathExtractor } from '@nestjs/core/middleware/route-info-path-extractor.js';
import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator.js';
import { RequestMethod } from '../../../common/enums/request-method.enum.js';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import { InvalidMiddlewareException } from '../../errors/exceptions/invalid-middleware.exception.js';
import { RuntimeException } from '../../errors/exceptions/runtime.exception.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';
import { MiddlewareBuilder } from '../../middleware/builder.js';
import { MiddlewareContainer } from '../../middleware/container.js';
import { MiddlewareModule } from '../../middleware/middleware-module.js';
import { RouterExceptionFilters } from '../../router/router-exception-filters.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

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

      const configureSpy = vi.fn();
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

      expect(configureSpy).toHaveBeenCalledOnce();
      expect(configureSpy).toHaveBeenCalledWith(
        new MiddlewareBuilder(
          (middlewareModule as any).routesMapper,
          undefined!,
          new RouteInfoPathExtractor(new ApplicationConfig()),
        ),
      );
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
    it('should throw "RuntimeException" exception when middleware is not stored in container', async () => {
      const route = { path: 'Test' };
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: [BaseController],
      };
      const useSpy = vi.fn();
      const app = { use: useSpy };

      middlewareModule['container'] = nestContainer;

      await expect(
        middlewareModule.registerRouteMiddleware(
          new MiddlewareContainer(nestContainer),
          route as any,
          configuration,
          'Test',
          app,
        ),
      ).rejects.toThrow(RuntimeException);
    });

    it('should throw "InvalidMiddlewareException" exception when middleware does not have "use" method', async () => {
      @Injectable()
      class InvalidMiddleware {}

      const route = { path: 'Test' };
      const configuration = {
        middleware: [InvalidMiddleware],
        forRoutes: [BaseController],
      };

      const useSpy = vi.fn();
      const app = { use: useSpy };

      const container = new MiddlewareContainer(nestContainer);
      const moduleKey = 'Test';
      container.insertConfig([configuration], moduleKey);

      const instance = new InvalidMiddleware();
      container.getMiddlewareCollection(moduleKey).set('InvalidMiddleware', {
        metatype: InvalidMiddleware,
        instance,
      } as any);

      middlewareModule['container'] = nestContainer;

      await expect(
        middlewareModule.registerRouteMiddleware(
          container,
          route as any,
          configuration,
          moduleKey,
          app,
        ),
      ).rejects.toThrow(InvalidMiddlewareException);
    });

    it('should mount middleware when is stored in container', async () => {
      const route = 'testPath';
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: ['test', BasicController, BaseController],
      };

      const createMiddlewareFactoryStub = vi
        .fn()
        .mockImplementation(() => () => null);
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
      vi.spyOn(stubContainer, 'getModuleByKey').mockImplementation(
        () => new Module(class {}, stubContainer),
      );
      middlewareModule['container'] = stubContainer;

      await middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app,
      );
      expect(createMiddlewareFactoryStub).toHaveBeenCalledOnce();
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
      const createMiddlewareFactoryStub = vi
        .fn()
        .mockImplementation(() => () => null);
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
      vi.spyOn(stubContainer, 'getModuleByKey').mockImplementation(
        () => new Module(class {}, stubContainer),
      );
      middlewareModule['container'] = stubContainer;

      const insertEntrypointDefinitionSpy = vi.spyOn(
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

      expect(createMiddlewareFactoryStub).toHaveBeenCalledOnce();
      expect(insertEntrypointDefinitionSpy).toHaveBeenCalledWith(
        {
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
        },
        expect.any(String),
      );
    });
  });
});
