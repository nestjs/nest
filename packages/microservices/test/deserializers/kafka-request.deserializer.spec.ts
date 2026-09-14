import { KafkaRequestDeserializer } from '../../deserializers/kafka-request.deserializer.js';

describe('KafkaRequestDeserializer', () => {
  describe('with the strictRequestEnvelope option', () => {
    it('should forward the option to the base deserializer', () => {
      const instance = new KafkaRequestDeserializer({
        strictRequestEnvelope: true,
      });
      const foreignPayload = { type: 'alert', data: { topic: 'logs' } };
      expect(
        instance.deserialize(foreignPayload, { channel: 'alerts' }),
      ).toEqual({
        pattern: 'alerts',
        data: foreignPayload,
      });
    });
    it('should leave a bare data packet untouched', () => {
      const instance = new KafkaRequestDeserializer({
        strictRequestEnvelope: true,
      });
      const bareDataPacket = { data: { id: 1 } };
      expect(instance.deserialize(bareDataPacket)).toBe(bareDataPacket);
    });
  });
});
