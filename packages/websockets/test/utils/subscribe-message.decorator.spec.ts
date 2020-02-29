import { expect } from 'chai';
import { MESSAGE_MAPPING_METADATA } from '../../constants';
import { SubscribeMessage } from '../../decorators/subscribe-message.decorator';

describe('@SubscribeMessage', () => {
  class TestGateway {
    @SubscribeMessage('filter')
    static fn() {}
  }

  it('should decorate transport with expected metadata', () => {
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      TestGateway.fn,
    );
    const message = Reflect.getMetadata('message', TestGateway.fn);

    expect(isMessageMapping).to.be.true;
    expect(message).to.be.eql('filter');
  });
});
