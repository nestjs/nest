import { Version } from '../../../common';
import { MiddlewareConfiguration } from '../../../common/interfaces';
import { expect } from 'chai';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  Get,
  RequestMapping,
} from '../../../common/decorators/http/request-mapping.decorator';
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

    @Version('1')
    @Get('versioned')
    public getVersioned() {}
  }

  let mapper: RoutesMapper;
  beforeEach(() => {
    mapper = new RoutesMapper(new NestContainer());
  });

  it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
    const config: MiddlewareConfiguration = {
      middleware: 'Test',
      forRoutes: [
        { path: 'test', method: RequestMethod.GET },
        { path: 'versioned', version: '1', method: RequestMethod.GET },
        TestRoute,
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/versioned', version: '1', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[2])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
      { path: '/test/versioned', method: RequestMethod.GET, version: '1' },
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
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
      { path: '/test2/test', method: RequestMethod.GET },
      { path: '/test2/another', method: RequestMethod.DELETE },
    ]);
  });
});
