import { expect } from 'chai';
import { RmqRecordBuilder } from '../../record-builders';
import { RmqRequestSerializer } from '../../serializers/rmq-request.serializer';

describe('RmqRequestSerializer', () => {
  let instance: RmqRequestSerializer;
  beforeEach(() => {
    instance = new RmqRequestSerializer();
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

    it('should act as an indentity function if msg is not an instance of RmqRecord class', () => {
      const packet = {
        data: { random: true },
      };
      expect(instance.serialize(packet)).to.eq(packet);
    });
  });
});
