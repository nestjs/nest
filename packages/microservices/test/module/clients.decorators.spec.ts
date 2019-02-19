import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { expect } from 'chai';
import { getClientToken, InjectClient } from '../../module';

describe('@InjectClient', () => {
  const clientName = 'test';
  class Test {
    constructor(@InjectClient(clientName) param) {}
  }

  it('should enhance class with expected constructor params metadata', () => {
    const metadata = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, Test);

    const expectedMetadata = [{ index: 0, param: getClientToken(clientName) }];
    expect(metadata).to.be.eql(expectedMetadata);
  });
});
