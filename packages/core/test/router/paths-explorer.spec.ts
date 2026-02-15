import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator.js';
import { RequestMethod } from '../../../common/enums/request-method.enum.js';
import { MetadataScanner } from '../../metadata-scanner.js';
import { PathsExplorer } from '../../router/paths-explorer.js';

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

      expect(paths).toHaveLength(4);

      expect(paths[0].path).toEqual(['/test']);
      expect(paths[1].path).toEqual(['/test']);
      expect(paths[2].path).toEqual(['/another-test']);
      expect(paths[3].path).toEqual(['/foo', '/bar']);

      expect(paths[0].requestMethod).toEqual(RequestMethod.GET);
      expect(paths[1].requestMethod).toEqual(RequestMethod.POST);
      expect(paths[2].requestMethod).toEqual(RequestMethod.ALL);
      expect(paths[3].requestMethod).toEqual(RequestMethod.GET);
    });

    it('should method return expected list of route paths alias', () => {
      const paths = pathsExplorer.scanForPaths(new TestRouteAlias());

      expect(paths).toHaveLength(4);

      expect(paths[0].path).toEqual(['/test']);
      expect(paths[1].path).toEqual(['/test']);
      expect(paths[2].path).toEqual(['/another-test']);
      expect(paths[3].path).toEqual(['/foo', '/bar']);

      expect(paths[0].requestMethod).toEqual(RequestMethod.GET);
      expect(paths[1].requestMethod).toEqual(RequestMethod.POST);
      expect(paths[2].requestMethod).toEqual(RequestMethod.ALL);
      expect(paths[3].requestMethod).toEqual(RequestMethod.GET);
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

      expect(route.path).toEqual(['/test']);
      expect(route.requestMethod).toEqual(RequestMethod.GET);
      expect(route.targetCallback).toBe(instance.getTest);
    });

    it('should method return expected object which represent single route with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTest',
      )!;

      expect(route.path).toEqual(['/test']);
      expect(route.requestMethod).toEqual(RequestMethod.GET);
      expect(route.targetCallback).toBe(instance.getTest);
    });

    it('should method return expected object which represent multiple routes', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTestUsingArray',
      )!;

      expect(route.path).toEqual(['/foo', '/bar']);
      expect(route.requestMethod).toEqual(RequestMethod.GET);
      expect(route.targetCallback).toBe(instance.getTestUsingArray);
    });

    it('should method return expected object which represent multiple routes with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = pathsExplorer.exploreMethodMetadata(
        instance,
        instanceProto,
        'getTestUsingArray',
      )!;

      expect(route.path).toEqual(['/foo', '/bar']);
      expect(route.requestMethod).toEqual(RequestMethod.GET);
      expect(route.targetCallback).toBe(instance.getTestUsingArray);
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

        expect(route.targetCallback).toBe(newImpl);
        expect(route.path).toEqual(['/test']);
        expect(route.requestMethod).toEqual(RequestMethod.GET);
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

        expect(route.targetCallback).toBe(newImpl);
        expect(route.path).toEqual(['/test']);
        expect(route.requestMethod).toEqual(RequestMethod.GET);
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

        expect(route.targetCallback).toBe(newImpl);
        expect(route.path).toEqual(['/foo', '/bar']);
        expect(route.requestMethod).toEqual(RequestMethod.GET);
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

        expect(route.targetCallback).toBe(newImpl);
        expect(route.path).toEqual(['/foo', '/bar']);
        expect(route.requestMethod).toEqual(RequestMethod.GET);
      });
    });
  });
});
