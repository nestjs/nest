import { RmqRecordBuilder } from '../../record-builders/index.js';
import { RmqRecordSerializer } from '../../serializers/rmq-record.serializer.js';

describe('RmqRecordSerializer', () => {
  const pattern = 'test';

  let instance: RmqRecordSerializer;
  beforeEach(() => {
    instance = new RmqRecordSerializer();
  });
  describe('serialize', () => {
    it('should parse rmq record instance', () => {
      const rmqMessage = new RmqRecordBuilder()
        .setData({ value: 'string' })
        .setOptions({ appId: 'app', persistent: true })
        .build();

      expect(
        instance.serialize({
          pattern,
          data: rmqMessage,
        }),
      ).toEqual({
        pattern,
        options: { appId: 'app', persistent: true },
        data: { value: 'string' },
      });
    });

    it('should act as an identity function if msg is not an instance of RmqRecord class', () => {
      const packet = {
        pattern,
        data: { random: true },
      };
      expect(instance.serialize(packet)).toBe(packet);
    });
    it('should return an undefined packet as is', () => {
      // @ts-expect-error -- runtime-only input, the signature requires a packet
      expect(instance.serialize(undefined)).toBeUndefined();
    });
    it('should return a null packet as is', () => {
      // @ts-expect-error -- runtime-only input, the signature requires a packet
      expect(instance.serialize(null)).toBeNull();
    });
    describe('when the packet is a reply', () => {
      it('should unwrap the record in "response" and expose its options, keeping "isDisposed"', () => {
        const rmqMessage = new RmqRecordBuilder({ value: 'string' })
          .setOptions({ priority: 5, headers: { key: 'value' } })
          .build();

        expect(
          instance.serialize({ response: rmqMessage, isDisposed: true }),
        ).toEqual({
          response: { value: 'string' },
          isDisposed: true,
          options: { priority: 5, headers: { key: 'value' } },
        });
      });
      it('should not change the record it unwraps', () => {
        const options = { priority: 5 };
        const rmqMessage = new RmqRecordBuilder({ value: 'string' })
          .setOptions(options)
          .build();

        instance.serialize({ response: rmqMessage });

        expect(rmqMessage.data).toEqual({ value: 'string' });
        expect(rmqMessage.options).toBe(options);
      });
      it('should act as an identity function if "response" is not an instance of RmqRecord class', () => {
        const packet = { response: { random: true }, isDisposed: true };
        expect(instance.serialize(packet)).toBe(packet);
      });
      it('should not unwrap a plain object that only looks like a record', () => {
        const packet = {
          response: { data: 'x', options: { priority: 1 } },
          isDisposed: true,
        };
        expect(instance.serialize(packet)).toBe(packet);
      });
    });
  });
});
