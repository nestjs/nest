import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { NestContainer } from '../../injector';
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
    container = new MiddlewareContainer(new NestContainer());
    resolver = new MiddlewareResolver(container);
    mockContainer = sinon.mock(container);
  });

  it('should resolve middleware instances from container', () => {
    const loadMiddleware = sinon.stub(
      // tslint:disable-next-line:no-string-literal
      resolver['instanceLoader'],
      'loadMiddleware',
    );
    const middleware = new Map();
    const wrapper = {
      instance: { metatype: {} },
      metatype: TestMiddleware,
    };
    middleware.set('TestMiddleware', wrapper);

    const module = { metatype: { name: '' } } as any;
    mockContainer.expects('getMiddlewareCollection').returns(middleware);
    resolver.resolveInstances(module, null);

    expect(loadMiddleware.callCount).to.be.equal(middleware.size);
    expect(loadMiddleware.calledWith(wrapper as any, middleware, module)).to.be
      .true;

    loadMiddleware.restore();
  });
});
