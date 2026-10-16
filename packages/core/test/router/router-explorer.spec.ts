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
import { NotFoundException } from '../../../common/exceptions/not-found.exception';
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
  let container: NestContainer;

  beforeEach(() => {
    container = new NestContainer();

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

  describe('applyHostFilter', () => {
    let handler: sinon.SinonSpy;
    let hostFilter: (req: any, res: any, next?: () => void) => unknown;

    beforeEach(() => {
      container.setHttpAdapter({
        getRequestHostname: (req: any) => req.hostname,
        getRequestMethod: (req: any) => req.method,
        getRequestUrl: (req: any) => req.url,
      });
      handler = sinon.spy();
      // We're using type assertion here because `applyHostFilter` is private
      hostFilter = (routerBuilder as any).applyHostFilter(
        ':tenant.example.com',
        handler,
      );
    });

    afterEach(() => sinon.restore());

    it('should call the handler with the host params when the host matches', () => {
      const req: Record<string, any> = { hostname: 'acme.example.com' };
      hostFilter(req, 'res');

      expect(handler.calledWith(req, 'res', undefined)).to.be.true;
      expect(req.hosts).to.deep.equal({ tenant: 'acme' });
    });

    it('should pass a request for another host on to the next route', () => {
      const next = sinon.spy();
      hostFilter({ hostname: 'example.org' }, 'res', next);

      expect(next.calledOnce).to.be.true;
      expect(handler.called).to.be.false;
    });

    describe('when the adapter cannot pass the request on', () => {
      const req = { hostname: 'example.org', method: 'GET', url: '/host?a=1' };

      it('should answer a request for another host with 404 without the hosts', () => {
        sinon.stub((routerBuilder as any).logger, 'warn');
        let error: unknown;
        try {
          hostFilter(req, 'res');
        } catch (e) {
          error = e;
        }

        expect(error).to.be.instanceOf(NotFoundException);
        expect((error as NotFoundException).getResponse()).to.deep.equal({
          message: 'Cannot GET /host?a=1',
          error: 'Not Found',
          statusCode: 404,
        });
        expect(handler.called).to.be.false;
      });

      it('should warn once that the adapter does not support filtering on hosts', () => {
        const warn = sinon.stub((routerBuilder as any).logger, 'warn');

        expect(() => hostFilter(req, 'res')).to.throw(NotFoundException);
        expect(() => hostFilter(req, 'res')).to.throw(NotFoundException);

        expect(warn.calledOnce).to.be.true;
        expect(warn.firstCall.args[0]).to.include(
          'HTTP adapter does not support filtering on host: ":tenant.example.com"',
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
});
