import { MESSAGE_MAPPING_METADATA } from '../../constants.js';
import { SubscribeMessage } from '../../decorators/subscribe-message.decorator.js';

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

    expect(isMessageMapping).toBe(true);
    expect(message).toEqual('filter');
  });
});
