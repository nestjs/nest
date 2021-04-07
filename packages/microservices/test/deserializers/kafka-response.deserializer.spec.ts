import { expect } from 'chai';

import { KafkaResponseDeserializer } from '../../deserializers/kafka-response.deserializer';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';

describe('KafkaResponseDeserializer', () => {
  const id = '10';

  let instance: KafkaResponseDeserializer;
  beforeEach(() => {
    instance = new KafkaResponseDeserializer();
  });
  describe('serialize', () => {
    describe('when error header is present', () => {
      it('should return an object with "err"', () => {
        const err = new Error();
        const packet = instance.deserialize({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: id,
            [KafkaHeaders.NEST_ERR]: err,
          },
        });
        expect(packet.id).to.be.equal(id);
        expect(packet.err).to.be.equal(err);
        expect(packet.isDisposed).to.be.true;
        expect(packet.response).to.be.undefined;
      });
    });
    describe('when is disposed header is present', () => {
      it('should return an objet with "isDisposed"', () => {
        const value = 'test';
        const packet = instance.deserialize({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: id,
            [KafkaHeaders.NEST_IS_DISPOSED]: true,
          },
          value,
        });
        expect(packet.id).to.be.equal(id);
        expect(packet.err).to.be.undefined;
        expect(packet.isDisposed).to.be.true;
        expect(packet.response).to.be.eql(value);
      });
    });
  });
});
