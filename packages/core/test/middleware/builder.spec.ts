import { expect } from 'chai';
import { Controller, Get, RequestMethod, Version } from '../../../common';
import { ApplicationConfig } from '../../application-config';
import { NestContainer } from '../../injector/container';
import { MiddlewareBuilder } from '../../middleware/builder';
import { RouteInfoPathExtractor } from '../../middleware/route-info-path-extractor';
import { RoutesMapper } from '../../middleware/routes-mapper';
import { NoopHttpAdapter } from './../utils/noop-adapter.spec';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    const container = new NestContainer();
    const appConfig = new ApplicationConfig();
    builder = new MiddlewareBuilder(
      new RoutesMapper(container),
      new NoopHttpAdapter({}),
      new RouteInfoPathExtractor(appConfig),
    );
  });
  describe('apply', () => {
    let configProxy;
    beforeEach(() => {
      configProxy = builder.apply([]);
    });
    it('should return configuration proxy', () => {
      const metatype = (MiddlewareBuilder as any).ConfigProxy;
      expect(configProxy instanceof metatype).to.be.true;
    });
    describe('configuration proxy', () => {
      describe('when "forRoutes()" called', () => {
        @Controller('path')
        class Test {
          @Get('route')
          public getAll() {}

          @Version('1')
          @Get('versioned')
          public getAllVersioned() {}
        }
        const route = { path: '/test', method: RequestMethod.GET };
        it('should store configuration passed as argument', () => {
          configProxy.forRoutes(route, Test);

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: RequestMethod.GET,
                  path: route.path,
                },
                {
                  method: RequestMethod.GET,
                  path: '/path/route',
                },
                {
                  method: RequestMethod.GET,
                  path: '/path/versioned',
                  version: '1',
                },
              ],
            },
          ]);
        });
      });
    });
  });

  describe('exclude', () => {
    it('should map string to RouteInfo', () => {
      const path = '/test';
      const proxy: any = builder.apply().exclude(path);

      expect(proxy.getExcludedRoutes()).to.be.eql([
        {
          path,
          method: -1 as any,
        },
      ]);
    });
  });
});
