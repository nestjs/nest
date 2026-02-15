import { KafkaResponseDeserializer } from '../../deserializers/kafka-response.deserializer.js';
import { KafkaHeaders } from '../../enums/kafka-headers.enum.js';

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
        expect(packet.id).toBe(id);
        expect(packet.err).toBe(err);
        expect(packet.isDisposed).toBe(true);
        expect(packet.response).toBeUndefined();
      });
    });
    describe('when is disposed header is present', () => {
      it('should return an object with "isDisposed"', () => {
        const value = 'test';
        const packet = instance.deserialize({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: id,
            [KafkaHeaders.NEST_IS_DISPOSED]: true,
          },
          value,
        });
        expect(packet.id).toBe(id);
        expect(packet.err).toBeUndefined();
        expect(packet.isDisposed).toBe(true);
        expect(packet.response).toEqual(value);
      });
    });
  });
});
