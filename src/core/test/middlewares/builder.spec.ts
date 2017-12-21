import { expect } from 'chai';
import { MiddlewareBuilder } from '../../middlewares/builder';
import { InvalidMiddlewareConfigurationException } from '../../errors/exceptions/invalid-middleware-configuration.exception';
import { RoutesMapper } from '../../middlewares/routes-mapper';
import { Controller, Get } from '../../../index';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    builder = new MiddlewareBuilder(new RoutesMapper());
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
              middlewares: [],
              forRoutes: [
                route,
                {
                  path: '/path/route',
                  method: 0
                }
              ]
            }
          ]);
        });
      });
    });
  });

  describe('use', () => {
    it('should store configuration passed as argument', () => {
      builder.use({
        middlewares: 'Test',
        forRoutes: 'Test'
      } as any);

      expect(builder.build()).to.deep.equal([
        {
          middlewares: 'Test',
          forRoutes: 'Test'
        }
      ]);
    });

    it('should be possible to chain "use" calls', () => {
      builder
        .use({
          middlewares: 'Test',
          forRoutes: 'Test'
        } as any)
        .use({
          middlewares: 'Test',
          forRoutes: 'Test'
        } as any);
      expect(builder.build()).to.deep.equal([
        {
          middlewares: 'Test',
          forRoutes: 'Test'
        },
        {
          middlewares: 'Test',
          forRoutes: 'Test'
        }
      ]);
    });

    it('should throw exception when middleware configuration object is invalid', () => {
      expect(builder.use.bind(builder, 'test')).throws(
        InvalidMiddlewareConfigurationException
      );
    });
  });
});
