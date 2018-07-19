import * as sinon from 'sinon';
import { expect } from 'chai';
import { MiddlewareResolver } from '../../middleware/resolver';
import { MiddlewareContainer } from '../../middleware/container';
import { Component } from '../../../common/decorators/core/component.decorator';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { Logger } from '../../../common/services/logger.service';
import { NestEnvironment } from '../../../common/enums/nest-environment.enum';

describe('MiddlewareResolver', () => {
  @Component()
  class TestMiddleware implements NestMiddleware {
    public resolve() {
      return (req, res, next) => {};
    }
  }

  let resolver: MiddlewareResolver;
  let container: MiddlewareContainer;
  let mockContainer: sinon.SinonMock;

  before(() => Logger.setMode(NestEnvironment.TEST));

  beforeEach(() => {
    container = new MiddlewareContainer();
    resolver = new MiddlewareResolver(container);
    mockContainer = sinon.mock(container);
  });

  it('should resolve middleware instances from container', () => {
    const loadInstanceOfMiddleware = sinon.stub(
      resolver['instanceLoader'],
      'loadInstanceOfMiddleware',
    );
    const middleware = new Map();
    const wrapper = {
      instance: { metatype: {} },
      metatype: TestMiddleware,
    };
    middleware.set('TestMiddleware', wrapper);

    const module = <any>{ metatype: { name: '' } };
    mockContainer.expects('getMiddleware').returns(middleware);
    resolver.resolveInstances(module, null);

    expect(loadInstanceOfMiddleware.callCount).to.be.equal(middleware.size);
    expect(loadInstanceOfMiddleware.calledWith(wrapper, middleware, module)).to
      .be.true;

    loadInstanceOfMiddleware.restore();
  });
});
