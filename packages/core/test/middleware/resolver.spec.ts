import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { NestEnvironment } from '../../../common/enums/nest-environment.enum';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { Logger } from '../../../common/services/logger.service';
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

  before(() => Logger.setMode(NestEnvironment.TEST));

  beforeEach(() => {
    container = new MiddlewareContainer();
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
    mockContainer.expects('getMiddleware').returns(middleware);
    resolver.resolveInstances(module, null);

    expect(loadMiddleware.callCount).to.be.equal(middleware.size);
    expect(loadMiddleware.calledWith(wrapper, middleware, module)).to.be.true;

    loadMiddleware.restore();
  });
});
