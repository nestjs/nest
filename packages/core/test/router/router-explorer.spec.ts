import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { VersioningType } from '../../../common/enums/version-type.enum';
import { Injector } from '../../../core/injector/injector';
import { ApplicationConfig } from '../../application-config';
import { UnknownRequestMappingException } from '../../errors/exceptions/unknown-request-mapping.exception';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { GraphInspector } from '../../inspector/graph-inspector';
import { MetadataScanner } from '../../metadata-scanner';
import { RoutePathMetadata } from '../../router/interfaces/route-path-metadata.interface';
import { RoutePathFactory } from '../../router/route-path-factory';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { RouterExplorer } from '../../router/router-explorer';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

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
      const bindStub = sinon.stub(
        routerBuilder,
        'applyCallbackToRouter' as any,
      );
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      routerBuilder.applyPathsToRouterProxy(
        null!,
        paths as any,
        null!,
        '',
        {},
        '',
      );

      expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });

    it('should method return expected object which represents a single versioned route', () => {
      const bindStub = sinon.stub(
        routerBuilder,
        'applyCallbackToRouter' as any,
      );
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      const routePathMetadata: RoutePathMetadata = {
        versioningOptions: { type: VersioningType.URI },
      };
      routerBuilder.applyPathsToRouterProxy(
        null!,
        paths as any,
        null!,
        '',
        routePathMetadata,
        '1',
      );

      expect(
        bindStub.calledWith(null, paths[0], null, '', routePathMetadata, '1'),
      ).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });
  });

  describe('extractRouterPath', () => {
    it('should return expected path', () => {
      expect(routerBuilder.extractRouterPath(TestRoute)).to.be.eql(['/global']);
    });

    it('should return expected path with alias', () => {
      expect(routerBuilder.extractRouterPath(TestRouteAlias)).to.be.eql([
        '/global',
        '/global-alias',
      ]);
    });

    it("should throw UnknownRequestMappingException when missing the `@Controller()` decorator in the class, displaying class's name", () => {
      expect(() =>
        routerBuilder.extractRouterPath(ClassWithMissingControllerDecorator),
      ).to.throw(
        UnknownRequestMappingException,
        /ClassWithMissingControllerDecorator/,
      );
    });
  });

  describe('createRequestScopedHandler', () => {
    let nextSpy: sinon.SinonSpy;

    beforeEach(() => {
      sinon.stub(injector, 'loadPerContext').callsFake(() => {
        throw new Error();
      });
      nextSpy = sinon.spy();
      sinon.stub(exceptionsFilter, 'create').callsFake(
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

        expect(nextSpy.called).to.be.true;
        expect(nextSpy.getCall(0).args[0]).to.be.instanceOf(Error);
        expect(nextSpy.getCall(0).args[1]).to.be.instanceOf(
          ExecutionContextHost,
        );
      });
    });
  });

  describe('applyVersionFilter', () => {
    it('should call and return the `applyVersionFilter` from the underlying http server', () => {
      const router = sinon.spy(new NoopHttpAdapter({}));
      const routePathMetadata: RoutePathMetadata = {
        methodVersion:
          sinon.fake() as unknown as RoutePathMetadata['methodVersion'],
        versioningOptions:
          sinon.fake() as unknown as RoutePathMetadata['versioningOptions'],
      };
      const handler = sinon.stub();

      // We're using type assertion here because `applyVersionFilter` is private
      const versionFilter = (routerBuilder as any).applyVersionFilter(
        router,
        routePathMetadata,
        handler,
      );

      expect(
        router.applyVersionFilter.calledOnceWithExactly(
          handler,
          routePathMetadata.methodVersion!,
          routePathMetadata.versioningOptions!,
        ),
      ).to.be.true;

      expect(router.applyVersionFilter.returnValues[0]).to.be.equal(
        versionFilter,
      );
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

      expect(
        Reflect.getMetadata('test_metadata_key', targetCallback),
      ).to.be.equal('test_metadata_value');
    });
  });

  describe('registerRouteRewrites', () => {
    let mockHttpAdapter: any;

    beforeEach(() => {
      mockHttpAdapter = {
        get: sinon.stub(),
        post: sinon.stub(),
        put: sinon.stub(),
        delete: sinon.stub(),
        patch: sinon.stub(),
        head: sinon.stub(),
        options: sinon.stub(),
        use: sinon.stub(),
      };

      // Reset the routeRewritesRegistered flag for each test
      (routerBuilder as any).routeRewritesRegistered = false;
    });

    it('should register route rewrites when applyPathsToRouterProxy is called', () => {
      const routeRewrites = [
        { from: '/old-path', to: '/new-path', statusCode: 301 },
        {
          from: '/another-old',
          to: '/another-new',
          methods: RequestMethod.GET,
        },
      ];
      applicationConfig.setRouteRewrites(routeRewrites);

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      expect(mockHttpAdapter.get.called).to.be.true;
    });

    it('should not register route rewrites when none are configured', () => {
      applicationConfig.setRouteRewrites([]);

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      expect(mockHttpAdapter.get.called).to.be.false;
    });

    it('should register route rewrites only once', () => {
      const routeRewrites = [{ from: '/old-path', to: '/new-path' }];
      applicationConfig.setRouteRewrites(routeRewrites);

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      expect(mockHttpAdapter.get.callCount).to.be.equal(1);
    });

    it('should register for all HTTP methods when no methods specified', () => {
      const routeRewrites = [{ from: '/old', to: '/new' }];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // All HTTP methods should be registered
      expect(mockHttpAdapter.get.called).to.be.true;
      expect(mockHttpAdapter.post.called).to.be.true;
      expect(mockHttpAdapter.delete.called).to.be.true;
    });

    it('should register only specified single method', () => {
      const routeRewrites = [
        { from: '/specific', to: '/new-specific', methods: RequestMethod.GET },
      ];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // Only GET method should be registered
      expect(mockHttpAdapter.get.callCount).to.be.equal(1);
      expect(mockHttpAdapter.post.callCount).to.be.equal(0);
      expect(mockHttpAdapter.delete.callCount).to.be.equal(0);
    });

    it('should register multiple specified methods', () => {
      const routeRewrites = [
        {
          from: '/multi',
          to: '/new-multi',
          methods: [RequestMethod.GET, RequestMethod.POST],
        },
      ];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;
      mockHttpAdapter.put.resetHistory();

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // GET and POST methods should be registered
      expect(mockHttpAdapter.get.callCount).to.be.equal(1);
      expect(mockHttpAdapter.post.callCount).to.be.equal(1);
      expect(mockHttpAdapter.delete.callCount).to.be.equal(0);
      expect(mockHttpAdapter.put.callCount).to.be.equal(0);
    });

    it('should use 301 status code by default', () => {
      const routeRewrites = [{ from: '/temp', to: '/maintenance' }];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // Verify the redirect handler uses 301 by default
      expect(mockHttpAdapter.get.called).to.be.true;
      const redirectHandler = mockHttpAdapter.get.firstCall.args[1];

      const mockResponse = { redirect: sinon.spy() };
      redirectHandler({}, mockResponse);

      expect(mockResponse.redirect.calledWith(301, '/maintenance')).to.be.true;
    });

    it('should use custom status code when provided', () => {
      const routeRewrites = [
        { from: '/temporary', to: '/temp-page', statusCode: 302 },
      ];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // Verify the redirect handler uses custom status code
      expect(mockHttpAdapter.get.called).to.be.true;
      const redirectHandler = mockHttpAdapter.get.firstCall.args[1];

      const mockResponse = { redirect: sinon.spy() };
      redirectHandler({}, mockResponse);

      expect(mockResponse.redirect.calledWith(302, '/temp-page')).to.be.true;
    });

    it('should handle complex scenario with methods and statusCode', () => {
      const routeRewrites = [
        {
          from: '/complex',
          to: '/new-complex',
          methods: RequestMethod.PUT,
          statusCode: 308,
        },
      ];
      applicationConfig.setRouteRewrites(routeRewrites);

      // Reset flag
      (routerBuilder as any).routeRewritesRegistered = false;

      routerBuilder.applyPathsToRouterProxy(
        mockHttpAdapter,
        [],
        {} as InstanceWrapper,
        'TestModule',
        {} as RoutePathMetadata,
        '',
      );

      // Only PUT method should be registered
      expect(mockHttpAdapter.put.callCount).to.be.equal(1);
      expect(mockHttpAdapter.get.callCount).to.be.equal(0);
      expect(mockHttpAdapter.post.callCount).to.be.equal(0);

      // Verify custom status code
      const redirectHandler = mockHttpAdapter.put.firstCall.args[1];
      const mockResponse = { redirect: sinon.spy() };
      redirectHandler({}, mockResponse);

      expect(mockResponse.redirect.calledWith(308, '/new-complex')).to.be.true;
    });
  });
});
