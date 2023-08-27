import { expect } from 'chai';
import { PARAM_ARGS_METADATA } from '../../constants';
import { MessageName } from '../../decorators';
import { WsParamtype } from '../../enums/ws-paramtype.enum';

class MessageNameTest {
  public test(@MessageName() name: string) {}
}

describe('@MessageName', () => {
  it('should enhance class with expected request metadata', () => {
    const argsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      MessageNameTest,
      'test',
    );
    const expectedMetadata = {
      [`${WsParamtype.MESSAGE}:0`]: {
        data: undefined,
        index: 0,
        pipes: [],
      },
    };
    expect(argsMetadata).to.be.eql(expectedMetadata);
  });
});
