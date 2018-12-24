import { expect } from 'chai';
import { Injectable } from '../../../common';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { MiddlewareConfiguration } from '../../../common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { MiddlewareContainer } from '../../middleware/container';

describe('MiddlewareContainer', () => {
  @Controller('test')
  class TestRoute {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  @Injectable()
  class TestMiddleware implements NestMiddleware {
    public use(req, res, next) {}
  }

  let container: MiddlewareContainer;

  beforeEach(() => {
    container = new MiddlewareContainer();
  });

  it('should store expected configurations for given module', () => {
    const config: MiddlewareConfiguration[] = [
      {
        middleware: [TestMiddleware],
        forRoutes: [TestRoute, 'test'],
      },
    ];
    container.insertConfig(config, 'Module' as any);
    expect([...container.getConfigurations().get('Module')]).to.deep.equal(
      config,
    );
  });

  it('should store expected middleware for given module', () => {
    const config: MiddlewareConfiguration[] = [
      {
        middleware: TestMiddleware,
        forRoutes: [TestRoute],
      },
    ];

    const key = 'Test' as any;
    container.insertConfig(config, key);
    expect(container.getMiddlewareCollection(key).size).to.eql(config.length);
    expect(container.getMiddlewareCollection(key).get('TestMiddleware')).to.eql(
      {
        scope: undefined,
        metatype: TestMiddleware,
        values: new WeakMap(),
      },
    );
  });
});
