import { expect } from 'chai';
import { MqttRecordBuilder } from '../../record-builders';
import { MqttRequestSerializer } from '../../serializers/mqtt-request.serializer';

describe('MqttRequestSerializer', () => {
  let instance: MqttRequestSerializer;
  beforeEach(() => {
    instance = new MqttRequestSerializer();
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
    it('should act as an indentity function if msg is not an instance of MqttRecord class', () => {
      const packet = {
        data: { random: true },
      };
      expect(instance.serialize(packet)).to.eq(packet);
    });
  });
});
