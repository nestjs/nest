import { RequestMethod } from '@nestjs/common';
import { expect } from 'chai';
import { Controller, Get } from '../../../common';
import { NestContainer } from '../../injector/container';
import { MiddlewareBuilder } from '../../middleware/builder';
import { RoutesMapper } from '../../middleware/routes-mapper';
import { NoopHttpAdapter } from './../utils/noop-adapter.spec';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    const container = new NestContainer();
    builder = new MiddlewareBuilder(
      new RoutesMapper(container),
      new NoopHttpAdapter({}),
      container,
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
        }
        const route = { path: '/test', method: 0 };
        it('should store configuration passed as argument', () => {
          configProxy.forRoutes(route, Test);

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: 0,
                  path: route.path,
                },
                {
                  method: 0,
                  path: '/path/route',
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
          method: RequestMethod.ALL,
        },
      ]);
    });
  });
});
