import { expect } from 'chai';
import { RmqRecordBuilder } from '../../record-builders';
import { RmqRecordSerializer } from '../../serializers/rmq-record.serializer';

describe('RmqRecordSerializer', () => {
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
          data: rmqMessage,
        }),
      ).to.deep.eq({
        options: { appId: 'app', persistent: true },
        data: { value: 'string' },
      });
    });

    it('should act as an identity function if msg is not an instance of RmqRecord class', () => {
      const packet = {
        data: { random: true },
      };
      expect(instance.serialize(packet)).to.eq(packet);
    });
  });
});
