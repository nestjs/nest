import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { Injector } from '../../../core/injector/injector';
import { ApplicationConfig } from '../../application-config';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { MetadataScanner } from '../../metadata-scanner';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { RouterExplorer } from '../../router/router-explorer';

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

  let routerBuilder: RouterExplorer;
  let injector: Injector;
  let exceptionsFilter: RouterExceptionFilters;

  beforeEach(() => {
    const container = new NestContainer();

    injector = new Injector();
    exceptionsFilter = new RouterExceptionFilters(
      container,
      new ApplicationConfig(),
      null,
    );
    routerBuilder = new RouterExplorer(
      new MetadataScanner(),
      container,
      injector,
      null,
      exceptionsFilter,
    );
  });

  describe('scanForPaths', () => {
    it('should method return expected list of route paths', () => {
      const paths = routerBuilder.scanForPaths(new TestRoute());

      expect(paths).to.have.length(4);

      expect(paths[0].path).to.eql(['/test']);
      expect(paths[1].path).to.eql(['/test']);
      expect(paths[2].path).to.eql(['/another-test']);
      expect(paths[3].path).to.eql(['/foo', '/bar']);

      expect(paths[0].requestMethod).to.eql(RequestMethod.GET);
      expect(paths[1].requestMethod).to.eql(RequestMethod.POST);
      expect(paths[2].requestMethod).to.eql(RequestMethod.ALL);
      expect(paths[3].requestMethod).to.eql(RequestMethod.GET);
    });
  });

  describe('exploreMethodMetadata', () => {
    it('should method return expected object which represent single route', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRoute(),
        instanceProto,
        'getTest',
      );

      expect(route.path).to.eql(['/test']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });

    it('should method return expected object which represent multiple routes', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRoute(),
        instanceProto,
        'getTestUsingArray',
      );

      expect(route.path).to.eql(['/foo', '/bar']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });
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
        '',
        '',
      );

      expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });
  });

  describe('applyPathsToRouterProxyWithDisableLogger', () => {
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
        '',
        '',
        true,
      );

      expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });
  });

  describe('extractRouterPath', () => {
    it('should return expected path', () => {
      expect(routerBuilder.extractRouterPath(TestRoute)).to.be.eql('/global');
      expect(routerBuilder.extractRouterPath(TestRoute, '/module')).to.be.eql(
        '/module/global',
      );
    });

    it('should throw it a there is a bad path expected path', () => {
      expect(() => routerBuilder.validateRoutePath(undefined)).to.throw();
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

      it('should delegete error to exception filters', async () => {
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
});
