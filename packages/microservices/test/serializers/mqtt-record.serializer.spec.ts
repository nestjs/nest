import { MqttRecordBuilder } from '../../record-builders/index.js';
import { MqttRecordSerializer } from '../../serializers/mqtt-record.serializer.js';

describe('MqttRecordSerializer', () => {
  let instance: MqttRecordSerializer;
  beforeEach(() => {
    instance = new MqttRecordSerializer();
  });
  describe('serialize', () => {
    it('should parse mqtt record instance to a string, ignoring options', () => {
      const mqttMessage = new MqttRecordBuilder()
        .setData({ value: 'string' })
        .setQoS(1)
        .setDup(true)
        .setRetain(true)
        .setProperties({})
        .build();

      expect(
        instance.serialize({
          pattern: 'pattern',
          data: mqttMessage,
        }),
      ).toEqual(
        JSON.stringify({
          pattern: 'pattern',
          data: { value: 'string' },
        }),
      );
    });
    it('should act as an identity function if msg is not an instance of MqttRecord class', () => {
      const packet = {
        pattern: 'pattern',
        data: { random: true },
      };
      expect(instance.serialize(packet)).toBe(JSON.stringify(packet));
    });
    it('should serialize an undefined packet to undefined', () => {
      // @ts-expect-error -- runtime-only input, the signature requires a packet
      expect(instance.serialize(undefined)).toBeUndefined();
    });
    it('should serialize a null packet to "null"', () => {
      // @ts-expect-error -- runtime-only input, the signature requires a packet
      expect(instance.serialize(null)).toBe('null');
    });
    describe('when the packet is a reply', () => {
      it('should unwrap the record in "response", keeping "isDisposed" and "id"', () => {
        const mqttMessage = new MqttRecordBuilder({ value: 'string' })
          .setQoS(1)
          .setProperties({ userProperties: { key: 'value' } })
          .build();

        const packet = { response: mqttMessage, isDisposed: true, id: '1' };

        expect(instance.serialize(packet)).toEqual(
          JSON.stringify({
            response: { value: 'string' },
            isDisposed: true,
            id: '1',
          }),
        );
      });
      it('should not change the record it unwraps', () => {
        const options = { qos: 1 as const };
        const mqttMessage = new MqttRecordBuilder({ value: 'string' })
          .setQoS(options.qos)
          .build();

        instance.serialize({ response: mqttMessage });

        expect(mqttMessage.data).toEqual({ value: 'string' });
        expect(mqttMessage.options).toEqual(options);
      });
      it('should act as an identity function if "response" is not an instance of MqttRecord class', () => {
        const packet = {
          response: { random: true },
          isDisposed: true,
          id: '1',
        };
        expect(instance.serialize(packet)).toBe(JSON.stringify(packet));
      });
      it('should not unwrap a plain object that only looks like a record', () => {
        const packet = {
          response: { data: 'x', options: { qos: 1 } },
          isDisposed: true,
        };
        expect(instance.serialize(packet)).toBe(JSON.stringify(packet));
      });
    });
  });
});
