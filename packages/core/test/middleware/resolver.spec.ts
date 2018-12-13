import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { MiddlewareContainer } from '../../middleware/container';
import { MiddlewareResolver } from '../../middleware/resolver';

describe('MiddlewareResolver', () => {
  @Injectable()
  class TestMiddleware implements NestMiddleware {
    public resolve() {
      return (req, res, next) => {};
    }
  }

  let resolver: MiddlewareResolver;
  let container: MiddlewareContainer;
  let mockContainer: sinon.SinonMock;

  beforeEach(() => {
    container = new MiddlewareContainer();
    resolver = new MiddlewareResolver(container);
    mockContainer = sinon.mock(container);
  });

  it('should resolve middleware instances from container', () => {
    const loadInstanceOfMiddleware = sinon.stub(
      // tslint:disable-next-line:no-string-literal
      resolver['instanceLoader'],
      'loadInstanceOfMiddleware',
    );
    const middleware = new Map();
    const wrapper = {
      instance: { metatype: {} },
      metatype: TestMiddleware,
    };
    middleware.set('TestMiddleware', wrapper);

    const module = { metatype: { name: '' } } as any;
    mockContainer.expects('getMiddleware').returns(middleware);
    resolver.resolveInstances(module, null);

    expect(loadInstanceOfMiddleware.callCount).to.be.equal(middleware.size);
    expect(loadInstanceOfMiddleware.calledWith(wrapper, middleware, module)).to
      .be.true;

    loadInstanceOfMiddleware.restore();
  });
});
