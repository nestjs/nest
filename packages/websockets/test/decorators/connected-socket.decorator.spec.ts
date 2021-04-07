import { expect } from 'chai';

import { PARAM_ARGS_METADATA } from '../../constants';
import { ConnectedSocket } from '../../decorators';
import { WsParamtype } from '../../enums/ws-paramtype.enum';

class ConnectedSocketTest {
  public test(@ConnectedSocket() socket: any) {}
}

describe('@ConnectedSocket', () => {
  it('should enhance class with expected request metadata', () => {
    const argsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      ConnectedSocketTest,
      'test',
    );
    const expectedMetadata = {
      [`${WsParamtype.SOCKET}:0`]: {
        data: undefined,
        index: 0,
        pipes: [],
      },
    };
    expect(argsMetadata).to.be.eql(expectedMetadata);
  });
});
