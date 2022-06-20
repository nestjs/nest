import { expect } from 'chai';
import { MqttRecordBuilder } from '../../record-builders';
import { MqttRecordSerializer } from '../../serializers/mqtt-record.serializer';

describe('MqttRecordSerializer', () => {
  let instance: MqttRecordSerializer;
  beforeEach(() => {
    instance = new MqttRecordSerializer();
  });
  describe('serialize', () => {
    it('should parse mqtt record instance', () => {
      const mqttMessage = new MqttRecordBuilder()
        .setData({ value: 'string' })
        .setQoS(1)
        .setDup(true)
        .setRetain(true)
        .setProperties({})
        .build();

      expect(
        instance.serialize({
          data: mqttMessage,
        }),
      ).to.deep.eq({
        options: { qos: 1, retain: true, dup: true, properties: {} },
        data: { value: 'string' },
      });
    });
    it('should act as an identity function if msg is not an instance of MqttRecord class', () => {
      const packet = {
        data: { random: true },
      };
      expect(instance.serialize(packet)).to.eq(packet);
    });
  });
});
