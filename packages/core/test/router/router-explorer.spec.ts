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
      null,
    );
    routerBuilder = new RouterExplorer(
      new MetadataScanner(),
      container,
      injector,
      null,
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
        null,
        paths as any,
        null,
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
        null,
        paths as any,
        null,
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
          } as any),
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
        await handler(null, null, null);

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
          routePathMetadata.methodVersion,
          routePathMetadata.versioningOptions,
        ),
      ).to.be.true;

      expect(router.applyVersionFilter.returnValues[0]).to.be.equal(
        versionFilter,
      );
    });
  });
});
