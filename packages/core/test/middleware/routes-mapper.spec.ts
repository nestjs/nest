import { expect } from 'chai';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { NestContainer } from '../../injector/container';
import { RoutesMapper } from '../../middleware/routes-mapper';

describe('RoutesMapper', () => {
  @Controller('test')
  class TestRoute {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  let mapper: RoutesMapper;
  beforeEach(() => {
    mapper = new RoutesMapper(new NestContainer());
  });

  it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
    const config = {
      middleware: 'Test',
      forRoutes: [{ path: 'test', method: RequestMethod.GET }, TestRoute],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET, isRequestMapping: true },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET, isRequestMapping: true },
      {
        path: '/test/another',
        method: RequestMethod.DELETE,
        isRequestMapping: true,
      },
    ]);
  });
  @Controller(['test', 'test2'])
  class TestRouteWithMultiplePaths {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  it('should map a controller with multiple paths to "ControllerMetadata" in forRoutes', () => {
    const config = {
      middleware: 'Test',
      forRoutes: [
        { path: 'test', method: RequestMethod.GET },
        TestRouteWithMultiplePaths,
        {
          path: 'test/isRequestMapping/false',
          method: RequestMethod.GET,
          isRequestMapping: false,
        },
        {
          path: 'test/isRequestMapping/true',
          method: RequestMethod.GET,
          isRequestMapping: true,
        },
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET, isRequestMapping: true },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET, isRequestMapping: true },
      {
        path: '/test/another',
        method: RequestMethod.DELETE,
        isRequestMapping: true,
      },
      {
        path: '/test2/test',
        method: RequestMethod.GET,
        isRequestMapping: true,
      },
      {
        path: '/test2/another',
        method: RequestMethod.DELETE,
        isRequestMapping: true,
      },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[2])).to.deep.equal([
      {
        path: '/test/isRequestMapping/false',
        method: RequestMethod.GET,
        isRequestMapping: false,
      },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[3])).to.deep.equal([
      {
        path: '/test/isRequestMapping/true',
        method: RequestMethod.GET,
        isRequestMapping: true,
      },
    ]);
  });
});
