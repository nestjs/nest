import { Injectable } from '../../../common/index.js';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface.js';
import { NestContainer } from '../../injector/index.js';
import { Injector } from '../../injector/injector.js';
import { MiddlewareContainer } from '../../middleware/container.js';
import { MiddlewareResolver } from '../../middleware/resolver.js';

describe('MiddlewareResolver', () => {
  @Injectable()
  class TestMiddleware implements NestMiddleware {
    public use(req, res, next) {}
  }

  let resolver: MiddlewareResolver;
  let container: MiddlewareContainer;

  beforeEach(() => {
    const injector = new Injector();
    container = new MiddlewareContainer(new NestContainer());
    resolver = new MiddlewareResolver(container, injector);
  });

  it('should resolve middleware instances from container', async () => {
    const loadMiddleware = vi
      .spyOn(resolver['injector'], 'loadMiddleware')
      .mockImplementation(() => ({}) as any);
    const middleware = new Map();
    const wrapper = {
      instance: { metatype: {} },
      metatype: TestMiddleware,
    };
    middleware.set('TestMiddleware', wrapper);

    const module = { metatype: { name: '' } } as any;
    vi.spyOn(container, 'getMiddlewareCollection').mockReturnValue(middleware);
    await resolver.resolveInstances(module, null!);

    expect(loadMiddleware.mock.calls.length).toBe(middleware.size);
    expect(loadMiddleware).toHaveBeenCalledWith(
      wrapper as any,
      middleware,
      module,
    );

    loadMiddleware.mockRestore?.();
  });
});
