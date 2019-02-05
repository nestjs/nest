import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterExplorer } from '../../router/router-explorer';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { MetadataScanner } from '../../metadata-scanner';
import { NestContainer } from '../../injector/container';

describe('RouterExplorer', () => {
  @Controller('global')
  class TestRoute {
    @RequestMapping({ path: 'test' })
    public getTest() { }

    @RequestMapping({ path: 'test', method: RequestMethod.POST })
    public postTest() { }

    @RequestMapping({ path: 'another-test', method: RequestMethod.ALL })
    public anotherTest() { }

    @RequestMapping({ path: ['foo', 'bar'] })
    public getTestUsingArray() { }
  }

  let routerBuilder: RouterExplorer;

  beforeEach(() => {
    routerBuilder = new RouterExplorer(new MetadataScanner(), new NestContainer());
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
      const bindStub = sinon.stub(routerBuilder, 'applyCallbackToRouter');
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      routerBuilder.applyPathsToRouterProxy(null, paths as any, null, '', '');

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
});
