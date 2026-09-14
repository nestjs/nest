import { NatsRequestJSONDeserializer } from '../../deserializers/nats-request-json.deserializer.js';

describe('NatsRequestJSONDeserializer', () => {
  describe('with the strictRequestEnvelope option', () => {
    it('should forward the option to the base deserializer', () => {
      const instance = new NatsRequestJSONDeserializer({
        strictRequestEnvelope: true,
      });
      const decoded = { type: 'alert', data: { id: 1 } };
      const message = { json: () => decoded };
      expect(instance.deserialize(message, { channel: 'alerts' })).toEqual({
        pattern: 'alerts',
        data: decoded,
      });
    });
  });
});
