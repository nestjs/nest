import { createError as createFastifyError } from '@fastify/error';
import {
  BadRequestException,
  HttpException,
  Module,
  Post,
  VersioningType,
} from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants.js';
import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import { Get } from '../../../common/decorators/http/request-mapping.decorator.js';
import { ApplicationConfig } from '../../application-config.js';
import { NestContainer } from '../../injector/index.js';
import { Injector } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';
import { SerializedGraph } from '../../inspector/serialized-graph.js';
import { RoutesResolver } from '../../router/routes-resolver.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

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

  @Controller({ version: '1' })
  class TestVersionRoute {
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
  let untypedRoutesResolver: any;
  let container: NestContainer;
  let modules: Map<string, any>;
  let applicationRef: any;

  beforeEach(() => {
    modules = new Map();
    applicationRef = {
      use: () => ({}),
      setNotFoundHandler: vi.fn(),
      setErrorHandler: vi.fn(),
    } as any;
    container = {
      getModules: () => modules,
      getModuleByKey: (key: string) => modules.get(key),
      getHttpAdapterRef: () => applicationRef,
      serializedGraph: new SerializedGraph(),
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
      new GraphInspector(container),
    );
    untypedRoutesResolver = routesResolver as any;
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
      const exploreSpy = vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'extractRouterPath',
      ).mockImplementation(() => ['']);
      routesResolver.registerRouters(routes, moduleName, '', '', appInstance);

      const routePathMetadata = {
        ctrlPath: '',
        modulePath: '',
        globalPrefix: '',
        controllerVersion: undefined,
        versioningOptions: undefined,
        methodVersion: undefined,
        methodPath: '/another-test',
      };
      expect(exploreSpy).toHaveBeenCalled();
      expect(exploreSpy).toHaveBeenCalledWith(
        routeWrapper,
        moduleName,
        appInstance,
        undefined,
        routePathMetadata,
      );
    });

    it('should register with host when specified', () => {
      const routes = new Map();
      const routeWrapper = new InstanceWrapper({
        instance: new TestHostRoute(),
        metatype: TestHostRoute,
      });
      routes.set('TestHostRoute', routeWrapper);

      const appInstance = new NoopHttpAdapter(router);
      const exploreSpy = vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'extractRouterPath',
      ).mockImplementation(() => ['']);
      routesResolver.registerRouters(routes, moduleName, '', '', appInstance);

      const routePathMetadata = {
        ctrlPath: '',
        modulePath: '',
        globalPrefix: '',
        controllerVersion: undefined,
        versioningOptions: undefined,
        methodVersion: undefined,
        methodPath: '/',
      };

      expect(exploreSpy).toHaveBeenCalled();
      expect(exploreSpy).toHaveBeenCalledWith(
        routeWrapper,
        moduleName,
        appInstance,
        'api.example.com',
        routePathMetadata,
      );
    });

    it('should register with version when specified', () => {
      const applicationConfig = new ApplicationConfig();
      applicationConfig.enableVersioning({
        type: VersioningType.URI,
      });
      routesResolver = new RoutesResolver(
        container,
        applicationConfig,
        new Injector(),
        new GraphInspector(container),
      );
      untypedRoutesResolver = routesResolver as any;

      const routes = new Map();
      const routeWrapper = new InstanceWrapper({
        instance: new TestVersionRoute(),
        metatype: TestVersionRoute,
      });
      routes.set('TestVersionRoute', routeWrapper);

      const appInstance = new NoopHttpAdapter(router);
      const exploreSpy = vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      vi.spyOn(
        untypedRoutesResolver.routerExplorer,
        'extractRouterPath',
      ).mockImplementation(() => ['']);
      routesResolver.registerRouters(routes, moduleName, '', '', appInstance);

      const routePathMetadata = {
        ctrlPath: '',
        modulePath: '',
        globalPrefix: '',
        controllerVersion: '1',
        versioningOptions: {
          type: VersioningType.URI,
        },
        methodVersion: undefined,
        methodPath: '/',
      };

      expect(exploreSpy).toHaveBeenCalled();
      expect(exploreSpy).toHaveBeenCalledWith(
        routeWrapper,
        moduleName,
        appInstance,
        undefined,
        routePathMetadata,
      );
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
      modules.set('TestModule', { routes, metatype: class {} });
      modules.set('TestModule2', { routes, metatype: class {} });

      const registerRoutersStub = vi
        .spyOn(routesResolver, 'registerRouters')
        .mockImplementation(() => undefined);

      routesResolver.resolve({ use: vi.fn() } as any, 'basePath');
      expect(registerRoutersStub).toHaveBeenCalledTimes(2);
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

        const spy = vi
          .spyOn(routesResolver, 'registerRouters')
          .mockImplementation(() => undefined);

        routesResolver.resolve(applicationRef, 'api/v1');

        expect(spy.mock.calls[0][2]).toBe('api/v1');
        expect(spy.mock.calls[0][3]).toBe('/test');
        expect(spy.mock.calls[1][2]).toBe('api/v1');
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

        const spy = vi
          .spyOn(routesResolver, 'registerRouters')
          .mockImplementation(() => undefined);

        routesResolver.resolve(applicationRef, '');

        expect(spy.mock.calls[0][2]).toBe('');
        expect(spy.mock.calls[0][3]).toBe('/test');
        // without module path
        expect(spy.mock.calls[1][2]).toBe('');
        expect(spy.mock.calls[1][3]).toBeUndefined();
      });
    });
  });

  describe('mapExternalExceptions', () => {
    describe('when exception prototype is', () => {
      describe('SyntaxError', () => {
        it('should map to BadRequestException', () => {
          const err = new SyntaxError();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).toBeInstanceOf(BadRequestException);
        });
      });
      describe('URIError', () => {
        it('should map to BadRequestException', () => {
          const err = new URIError();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).toBeInstanceOf(BadRequestException);
        });
      });
      describe('FastifyError', () => {
        it('should map FastifyError with status code to HttpException', () => {
          const FastifyErrorCls = createFastifyError(
            'FST_ERR_CTP_INVALID_MEDIA_TYPE',
            'Unsupported Media Type: %s',
            415,
          );
          const error = new FastifyErrorCls();

          const result = routesResolver.mapExternalException(error);

          expect(result).toBeInstanceOf(HttpException);
          expect(result.message).toBe(error.message);
          expect(result.getStatus()).toBe(415);
        });

        it('should return FastifyError without user status code to Internal Server Error HttpException', () => {
          const FastifyErrorCls = createFastifyError(
            'FST_WITHOUT_STATUS_CODE',
            'Error without status code',
          );
          const error = new FastifyErrorCls();

          const result = routesResolver.mapExternalException(error);
          expect(result).toBeInstanceOf(HttpException);
          expect(result.message).toBe(error.message);
          expect(result.getStatus()).toBe(500);
        });
      });
      describe('other', () => {
        it('should behave as an identity', () => {
          const err = new Error();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).toEqual(err);
        });
      });
    });
  });

  describe('registerNotFoundHandler', () => {
    it('should register not found handler', () => {
      routesResolver.registerNotFoundHandler();

      expect(applicationRef.setNotFoundHandler).toHaveBeenCalled();
    });
  });

  describe('registerExceptionHandler', () => {
    it('should register exception handler', () => {
      routesResolver.registerExceptionHandler();

      expect(applicationRef.setErrorHandler).toHaveBeenCalled();
    });
  });
});
