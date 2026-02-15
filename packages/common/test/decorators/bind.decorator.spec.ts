import { ROUTE_ARGS_METADATA } from '../../constants.js';
import { Bind } from '../../decorators/core/bind.decorator.js';
import { Req } from '../../decorators/http/route-params.decorator.js';

describe('@Bind', () => {
  class TestWithMethod {
    @Bind(Req())
    public test() {}
  }

  it('should enhance method - bind each decorator to method', () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestWithMethod,
      'test',
    );

    expect(metadata).toEqual({
      '0:0': {
        data: undefined,
        index: 0,
        pipes: [],
      },
    });
  });
});
