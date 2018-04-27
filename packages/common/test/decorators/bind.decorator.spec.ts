import { expect } from 'chai';
import { Bind } from '../../decorators/core/bind.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Req } from '../../decorators/http/route-params.decorator';

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

    expect(metadata).to.be.deep.equal({
      '0:0': {
        data: undefined,
        index: 0,
        pipes: [],
      },
    });
  });
});
