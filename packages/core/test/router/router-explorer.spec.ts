import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator.js';
import { RequestMethod } from '../../../common/enums/request-method.enum.js';
import { VersioningType } from '../../../common/enums/version-type.enum.js';
import { Injector } from '../../../core/injector/injector.js';
import { ApplicationConfig } from '../../application-config.js';
import { UnknownRequestMappingException } from '../../errors/exceptions/unknown-request-mapping.exception.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';
import { MetadataScanner } from '../../metadata-scanner.js';
import { RoutePathMetadata } from '../../router/interfaces/route-path-metadata.interface.js';
import { RoutePathFactory } from '../../router/route-path-factory.js';
import { RouterExceptionFilters } from '../../router/router-exception-filters.js';
import { RouterExplorer } from '../../router/router-explorer.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterExplorer', () => {
  @Controller('global')
  class TestRoute {
    @Get('test')
    public getTest() {}

    @Post('test')
    public postTest() {}

    @All('another-test')
    public anotherTest() {}

    @Get(['foo', 'bar'])
    public getTestUsingArray() {}
  }

  @Controller(['global', 'global-alias'])
  class TestRouteAlias {
    @Get('test')
    public getTest() {}

    @Post('test')
    public postTest() {}

    @All('another-test')
    public anotherTest() {}

    @Get(['foo', 'bar'])
    public getTestUsingArray() {}
  }

  class ClassWithMissingControllerDecorator {}

  let routerBuilder: RouterExplorer;
  let injector: Injector;
  let exceptionsFilter: RouterExceptionFilters;
  let applicationConfig: ApplicationConfig;
  let routePathFactory: RoutePathFactory;
  let graphInspector: GraphInspector;

  beforeEach(() => {
    const container = new NestContainer();

    applicationConfig = new ApplicationConfig();
    injector = new Injector();
    routePathFactory = new RoutePathFactory(applicationConfig);
    graphInspector = new GraphInspector(container);
    exceptionsFilter = new RouterExceptionFilters(
      container,
      applicationConfig,
      null!,
    );
    routerBuilder = new RouterExplorer(
      new MetadataScanner(),
      container,
      injector,
      null!,
      exceptionsFilter,
      applicationConfig,
      routePathFactory,
      graphInspector,
    );
  });

  describe('applyPathsToRouterProxy', () => {
    it('should method return expected object which represent single route', () => {
      const bindStub = vi
        .spyOn(routerBuilder, 'applyCallbackToRouter' as any)
        .mockImplementation(() => {});
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      const mockInstanceWrapper = { instance: {} } as any;
      routerBuilder.applyPathsToRouterProxy(
        null!,
        paths as any,
        mockInstanceWrapper,
        '',
        {},
        '',
      );

      expect(bindStub).toHaveBeenCalledWith(
        null,
        paths[0],
        mockInstanceWrapper,
        '',
        { methodVersion: undefined },
        '',
      );
      expect(bindStub).toHaveBeenCalledTimes(paths.length);
    });

    it('should method return expected object which represents a single versioned route', () => {
      const bindStub = vi
        .spyOn(routerBuilder, 'applyCallbackToRouter' as any)
        .mockImplementation(() => {});
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      const routePathMetadata: RoutePathMetadata = {
        versioningOptions: { type: VersioningType.URI },
      };
      const mockInstanceWrapper = { instance: {} } as any;
      routerBuilder.applyPathsToRouterProxy(
        null!,
        paths as any,
        mockInstanceWrapper,
        '',
        routePathMetadata,
        '1',
      );

      expect(bindStub).toHaveBeenCalledWith(
        null,
        paths[0],
        mockInstanceWrapper,
        '',
        routePathMetadata,
        '1',
      );
      expect(bindStub).toHaveBeenCalledTimes(paths.length);
    });
  });

  describe('extractRouterPath', () => {
    it('should return expected path', () => {
      expect(routerBuilder.extractRouterPath(TestRoute)).toEqual(['/global']);
    });

    it('should return expected path with alias', () => {
      expect(routerBuilder.extractRouterPath(TestRouteAlias)).toEqual([
        '/global',
        '/global-alias',
      ]);
    });

    it("should throw UnknownRequestMappingException when missing the `@Controller()` decorator in the class, displaying class's name", () => {
      expect(() =>
        routerBuilder.extractRouterPath(ClassWithMissingControllerDecorator),
      ).toThrow(
        UnknownRequestMappingException,
        /ClassWithMissingControllerDecorator/,
      );
    });
  });

  describe('createRequestScopedHandler', () => {
    let nextSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.spyOn(injector, 'loadPerContext').mockImplementation(() => {
        throw new Error();
      });
      nextSpy = vi.fn();
      vi.spyOn(exceptionsFilter, 'create').mockImplementation(
        () =>
          ({
            next: nextSpy,
          }) as any,
      );
    });

    describe('when "loadPerContext" throws', () => {
      const moduleKey = 'moduleKey';
      const methodKey = 'methodKey';
      const module = {
        controllers: new Map(),
      } as any;
      const wrapper = new InstanceWrapper({
        instance: { [methodKey]: {} },
      });

      it('should delegate error to exception filters', async () => {
        const handler = routerBuilder.createRequestScopedHandler(
          wrapper,
          RequestMethod.ALL,
          module,
          moduleKey,
          methodKey,
        );
        await handler(null!, null, null!);

        expect(nextSpy).toHaveBeenCalled();
        expect(nextSpy.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(nextSpy.mock.calls[0][1]).toBeInstanceOf(ExecutionContextHost);
      });
    });
  });

  describe('applyVersionFilter', () => {
    it('should call and return the `applyVersionFilter` from the underlying http server', () => {
      const router = new NoopHttpAdapter({});
      const applyVersionFilterSpy = vi.spyOn(router, 'applyVersionFilter');
      const routePathMetadata: RoutePathMetadata = {
        methodVersion: vi.fn() as unknown as RoutePathMetadata['methodVersion'],
        versioningOptions:
          vi.fn() as unknown as RoutePathMetadata['versioningOptions'],
      };
      const handler = vi.fn();

      // We're using type assertion here because `applyVersionFilter` is private
      const versionFilter = (routerBuilder as any).applyVersionFilter(
        router,
        routePathMetadata,
        handler,
      );

      expect(applyVersionFilterSpy).toHaveBeenCalledWith(
        handler,
        routePathMetadata.methodVersion!,
        routePathMetadata.versioningOptions!,
      );

      expect(applyVersionFilterSpy.mock.results[0].value).toBe(versionFilter);
    });
  });

  describe('copyMetadataToCallback', () => {
    it('should then copy the metadata from the original callback to the target callback', () => {
      const originalCallback = () => {};
      Reflect.defineMetadata(
        'test_metadata_key',
        'test_metadata_value',
        originalCallback,
      );

      const targetCallback = () => {};

      // We're using type assertion here because `copyMetadataToCallback` is private
      (routerBuilder as any).copyMetadataToCallback(
        originalCallback,
        targetCallback,
      );

      expect(Reflect.getMetadata('test_metadata_key', targetCallback)).toBe(
        'test_metadata_value',
      );
    });
  });
});
