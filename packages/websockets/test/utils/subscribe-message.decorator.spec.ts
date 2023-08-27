import { expect } from 'chai';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../../constants';
import { SubscribeMessage } from '../../decorators/subscribe-message.decorator';

describe('@SubscribeMessage', () => {
  const message = 'filter';
  const secMessage = 'filter2';

  class TestGateway {
    @SubscribeMessage(message)
    static fn() {}

    @SubscribeMessage(message, secMessage)
    static fnSec() {}

    @SubscribeMessage(secMessage)
    @SubscribeMessage(message)
    static fnThi() {}
  }

  it('should decorate transport with expected metadata single decorator with single message', () => {
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      TestGateway.fn,
    );
    const messages = Reflect.getMetadata(MESSAGE_METADATA, TestGateway.fn);

    expect(isMessageMapping).to.be.true;
    expect(messages).to.be.deep.eq([message]);
  });

  it('should decorate transport with expected metadata single decorator with multiple messages', () => {
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      TestGateway.fn,
    );
    const messages = Reflect.getMetadata(MESSAGE_METADATA, TestGateway.fnSec);

    expect(isMessageMapping).to.be.true;
    expect(messages).to.be.deep.eq([message, secMessage]);
  });

  it('should decorate transport with expected metadata double decorator with single messages', () => {
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      TestGateway.fn,
    );
    const messages = Reflect.getMetadata(MESSAGE_METADATA, TestGateway.fnThi);

    expect(isMessageMapping).to.be.true;
    expect(messages).to.be.deep.eq([message, secMessage]);
  });
});
