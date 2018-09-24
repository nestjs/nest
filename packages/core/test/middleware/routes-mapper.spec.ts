import { expect } from 'chai';
import { Controller } from '@nestjs/common/decorators/core/controller.decorator';
import { RequestMapping } from '@nestjs/common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { NestContainer } from '@nestjs/core/injector/container';
import { RoutesMapper } from '@nestjs/core/middleware/routes-mapper';

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
      { path: '/test', method: RequestMethod.GET },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
    ]);
  });
});
