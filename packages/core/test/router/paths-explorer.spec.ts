import { expect } from 'chai';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { MetadataScanner } from '../../metadata-scanner';
import { PathsExplorer } from '../../router/paths-explorer';

describe('PathsExplorer', () => {
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

  let pathsExplorer: PathsExplorer;

  beforeEach(() => {
    pathsExplorer = new PathsExplorer(new MetadataScanner());
  });

  describe('scanForPaths', () => {
    it('should method return expected list of route paths', () => {
      const paths = pathsExplorer.scanForPaths(new TestRoute());

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

    it('should method return expected list of route paths alias', () => {
      const paths = pathsExplorer.scanForPaths(new TestRouteAlias());

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

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTest',
      )!;

      expect(route.path).to.eql(['/test']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
      expect(route.targetCallback).to.eq(instance.getTest);
    });

    it('should method return expected object which represent single route with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTest',
      )!;

      expect(route.path).to.eql(['/test']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
      expect(route.targetCallback).to.eq(instance.getTest);
    });

    it('should method return expected object which represent multiple routes', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTestUsingArray',
      )!;

      expect(route.path).to.eql(['/foo', '/bar']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
      expect(route.targetCallback).to.eq(instance.getTestUsingArray);
    });

    it('should method return expected object which represent multiple routes with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTestUsingArray',
      )!;

      expect(route.path).to.eql(['/foo', '/bar']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
      expect(route.targetCallback).to.eq(instance.getTestUsingArray);
    });

    describe('when new implementation is injected into router', () => {
      it('should method return changed impl of single route', () => {
        const instance = new TestRoute();
        const instanceProto = Object.getPrototypeOf(instance);

        const newImpl = function () {};
        instance.getTest = newImpl;

        const route = pathsExplorer.exploreMethodMetadata(
          instance,
          instanceProto,
          'getTest',
        )!;

        expect(route.targetCallback).to.eq(newImpl);
        expect(route.path).to.eql(['/test']);
        expect(route.requestMethod).to.eql(RequestMethod.GET);
      });

      it('should method return changed impl of single route which alias applied', () => {
        const instance = new TestRouteAlias();
        const instanceProto = Object.getPrototypeOf(instance);

        const newImpl = function () {};
        instance.getTest = newImpl;

        const route = pathsExplorer.exploreMethodMetadata(
          instance,
          instanceProto,
          'getTest',
        )!;

        expect(route.targetCallback).to.eq(newImpl);
        expect(route.path).to.eql(['/test']);
        expect(route.requestMethod).to.eql(RequestMethod.GET);
      });

      it('should method return changed impl of multiple routes', () => {
        const instance = new TestRoute();
        const instanceProto = Object.getPrototypeOf(instance);

        const newImpl = function () {};
        instance.getTestUsingArray = newImpl;

        const route = pathsExplorer.exploreMethodMetadata(
          instance,
          instanceProto,
          'getTestUsingArray',
        )!;

        expect(route.targetCallback).to.eq(newImpl);
        expect(route.path).to.eql(['/foo', '/bar']);
        expect(route.requestMethod).to.eql(RequestMethod.GET);
      });

      it('should method return changed impl of multiple routes which alias applied', () => {
        const instance = new TestRouteAlias();
        const instanceProto = Object.getPrototypeOf(instance);

        const newImpl = function () {};
        instance.getTestUsingArray = newImpl;

        const route = pathsExplorer.exploreMethodMetadata(
          instance,
          instanceProto,
          'getTestUsingArray',
        )!;

        expect(route.targetCallback).to.eq(newImpl);
        expect(route.path).to.eql(['/foo', '/bar']);
        expect(route.requestMethod).to.eql(RequestMethod.GET);
      });
    });
  });
});
