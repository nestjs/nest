import { expect } from 'chai';

import { PARAM_ARGS_METADATA } from '../../constants';
import { Ctx } from '../../decorators';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum';

class CtxTest {
  public test(@Ctx() ctx: any) {}
}

describe('@Ctx', () => {
  it('should enhance class with expected request metadata', () => {
    const argsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      CtxTest,
      'test',
    );
    const expectedMetadata = {
      [`${RpcParamtype.CONTEXT}:0`]: {
        data: undefined,
        index: 0,
        pipes: [],
      },
    };
    expect(argsMetadata).to.be.eql(expectedMetadata);
  });
});
