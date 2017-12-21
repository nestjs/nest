import { expect } from 'chai';
import { RoutesMapper } from '../../middlewares/routes-mapper';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { UnknownRequestMappingException } from '../../errors/exceptions/unknown-request-mapping.exception';

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
    mapper = new RoutesMapper();
  });

  it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
    const config = {
      middlewares: 'Test',
      forRoutes: [{ path: 'test', method: RequestMethod.GET }, TestRoute]
    };

    expect(mapper.mapRouteToRouteProps(config.forRoutes[0])).to.deep.equal([
      {
        path: '/test',
        method: RequestMethod.GET
      }
    ]);

    expect(mapper.mapRouteToRouteProps(config.forRoutes[1])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE }
    ]);
  });

  it('should throw exception when invalid object was passed as route', () => {
    const config = {
      middlewares: 'Test',
      forRoutes: [{ method: RequestMethod.GET }]
    };

    expect(
      mapper.mapRouteToRouteProps.bind(mapper, config.forRoutes[0])
    ).throws(UnknownRequestMappingException);
  });
});
