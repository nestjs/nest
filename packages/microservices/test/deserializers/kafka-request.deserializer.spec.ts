import { KafkaRequestDeserializer } from '../../deserializers/kafka-request.deserializer.js';

describe('KafkaRequestDeserializer', () => {
  let instance: KafkaRequestDeserializer;
  const options = { channel: 'users' };

  beforeEach(() => {
    instance = new KafkaRequestDeserializer();
  });

  describe('deserialize', () => {
    it('should preserve null payloads in tombstone records', async () => {
      const message = {
        key: 'user-1',
        value: null,
        headers: {},
        offset: '1',
        timestamp: '0',
        topic: 'users',
        partition: 0,
      };

      expect(await instance.deserialize(message, options)).toEqual({
        pattern: options.channel,
        data: null,
      });
    });

    it.each(['hello', 0, false, '', { id: 'user-1' }, ['user-1']])(
      'should preserve the payload %j',
      async value => {
        const message = { key: 'user-1', value, headers: {} };

        const packet = await instance.deserialize(message, options);

        expect(packet.pattern).toBe(options.channel);
        expect(packet.data).toBe(value);
      },
    );

    it.each([{ key: 'user-1', headers: {} }, { value: undefined }])(
      'should fall back to the message when value is undefined or absent: %j',
      async message => {
        const packet = await instance.deserialize(message, options);

        expect(packet.pattern).toBe(options.channel);
        expect(packet.data).toBe(message);
      },
    );

    it.each([null, undefined, 'hello', 0, false, ''])(
      'should preserve raw input %j',
      async value => {
        const packet = await instance.deserialize(value, options);

        expect(packet.pattern).toBe(options.channel);
        expect(packet.data).toBe(value);
      },
    );

    it('should return undefined pattern and data when options are absent', async () => {
      expect(await instance.deserialize({ value: null })).toEqual({
        pattern: undefined,
        data: undefined,
      });
    });

    it('should preserve internal requests unchanged', async () => {
      const request = { id: '1', pattern: 'users', data: null };

      expect(await instance.deserialize(request, options)).toBe(request);
    });
  });
});
