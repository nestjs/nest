import { expect } from 'chai';
import { MiddlewareBuilder } from '../../middleware/builder';
import { InvalidMiddlewareConfigurationException } from '../../errors/exceptions/invalid-middleware-configuration.exception';
import { RoutesMapper } from '../../middleware/routes-mapper';
import { Get, Controller } from '../../../common';
import { NestContainer } from '../../injector/container';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    builder = new MiddlewareBuilder(new RoutesMapper(new NestContainer()));
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
      it('should returns itself on "with()" call', () => {
        expect(configProxy.with()).to.be.eq(configProxy);
      });
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
                route.path,
                '/path/route',
              ],
            },
          ]);
        });
      });
    });
  });
});
