import { PARAM_ARGS_METADATA } from '../../constants.js';
import { Ctx } from '../../decorators/index.js';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum.js';

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
    expect(argsMetadata).toEqual(expectedMetadata);
  });
});
