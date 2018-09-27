import 'reflect-metadata';
import { INVALID_MIDDLEWARE_CONFIGURATION } from '@nest/server/errors/messages';
import { Controller, RequestMapping, RequestMethod } from '@nest/server';
import { RouterBuilder } from '@nest/server/router';
import { Test, TestingModule } from '@nest/testing';
import { RouterMethodFactory } from '@nest/server/router/router-method-factory.service';

import { HTTP_SERVER_PROVIDER } from '../fake-http-server';

describe('RouterBuilder', () => {
  let routerBuilder: RouterBuilder;
  let test: TestingModule;

  @Controller('global')
  class TestController {
    @RequestMapping('test')
    public getTest() {}

    @RequestMapping('test', RequestMethod.POST)
    public postTest() {}

    @RequestMapping('another-test', RequestMethod.ALL)
    public anotherTest() {}
  }

  beforeEach(async () => {
    test = await Test.createTestingModule({
      providers: [
        HTTP_SERVER_PROVIDER,
        RouterMethodFactory,
        TestController,
        RouterBuilder,
      ],
    }).compile();

    routerBuilder = test.get<RouterBuilder>(RouterBuilder);
  });

  describe('scanForPaths', () => {
    it('should method return expected list of route paths', () => {
      const paths = routerBuilder.scanForPaths(TestController);

      expect(paths).toHaveLength(3);

      expect(paths[0].path).toEqual('/test');
      expect(paths[1].path).toEqual('/test');
      expect(paths[2].path).toEqual('/another-test');

      expect(paths[0].requestMethod).toEqual(RequestMethod.GET);
      expect(paths[1].requestMethod).toEqual(RequestMethod.POST);
      expect(paths[2].requestMethod).toEqual(RequestMethod.ALL);
    });
  });

  describe('exploreMethodMetadata', () => {
    it('should method return expected object which represent single route', () => {
      const route = routerBuilder.exploreMethodMetadata(
        TestController,
        'getTest',
      );

      expect(route.path).toEqual('/test');
      expect(route.requestMethod).toEqual(RequestMethod.GET);
      expect(route.targetCallback).toEqual(TestController.prototype.getTest);
    });
  });

  describe('extractRouterPath', () => {
    it('should return expected path', () => {
      expect(routerBuilder.extractRouterPath(TestController)).toEqual(
        '/global',
      );
      expect(
        routerBuilder.extractRouterPath(TestController, '/module'),
      ).toEqual('/module/global');
    });

    it('should throw if there is a bad expected path', () => {
      expect(() => routerBuilder.validateRoutePath(null)).toThrow(
        INVALID_MIDDLEWARE_CONFIGURATION,
      );
    });
  });
});
