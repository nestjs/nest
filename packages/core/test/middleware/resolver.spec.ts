import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { NestContainer } from '../../injector';
import { Injector } from '../../injector/injector';
import { MiddlewareContainer } from '../../middleware/container';
import { MiddlewareResolver } from '../../middleware/resolver';

describe('MiddlewareResolver', () => {
  @Injectable()
  class TestMiddleware implements NestMiddleware {
    public use(req, res, next) {}
  }

  let resolver: MiddlewareResolver;
  let container: MiddlewareContainer;
  let mockContainer: sinon.SinonMock;

  beforeEach(() => {
    const injector = new Injector();
    container = new MiddlewareContainer(new NestContainer());
    resolver = new MiddlewareResolver(container, injector);
    mockContainer = sinon.mock(container);
  });

  it('should resolve middleware instances from container', async () => {
    const loadMiddleware = sinon.stub(resolver['injector'], 'loadMiddleware');
    const middleware = new Map();
    const wrapper = {
      instance: { metatype: {} },
      metatype: TestMiddleware,
    };
    middleware.set('TestMiddleware', wrapper);

    const module = { metatype: { name: '' } } as any;
    mockContainer.expects('getMiddlewareCollection').returns(middleware);
    await resolver.resolveInstances(module, null!);

    expect(loadMiddleware.callCount).to.be.equal(middleware.size);
    expect(loadMiddleware.calledWith(wrapper as any, middleware, module)).to.be
      .true;

    loadMiddleware.restore();
  });
});
