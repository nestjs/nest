import { ValidationPipe } from '@nestjs/common';
import { expect } from 'chai';
import { PARAM_ARGS_METADATA } from '../../constants';
import { Payload } from '../../decorators';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum';

class MessagePayloadTest {
  public test(@Payload(ValidationPipe) payload: any) {}
}

describe('@Payload', () => {
  it('should enhance class with expected request metadata', () => {
    const argsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      MessagePayloadTest,
      'test',
    );
    const expectedMetadata = {
      [`${RpcParamtype.PAYLOAD}:0`]: {
        data: undefined,
        index: 0,
        pipes: [ValidationPipe],
      },
    };
    expect(argsMetadata).to.be.eql(expectedMetadata);
  });
});
