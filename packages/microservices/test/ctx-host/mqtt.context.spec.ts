import { MqttContext } from '../../ctx-host/index.js';

describe('MqttContext', () => {
  const args = ['test', { test: true }];
  let context: MqttContext;

  beforeEach(() => {
    context = new MqttContext(args as [string, Record<string, any>]);
  });
  describe('getTopic', () => {
    it('should return topic', () => {
      expect(context.getTopic()).toEqual(args[0]);
    });
  });
  describe('getPacket', () => {
    it('should return packet', () => {
      expect(context.getPacket()).toEqual(args[1]);
    });
  });
  describe('getMetadata', () => {
    it('should return the user properties with a single value', () => {
      const packet = {
        properties: {
          userProperties: { 'x-request-id': 'trace-1', 'x-tag': ['a', 'b'] },
        },
      };

      expect(new MqttContext(['test', packet]).getMetadata()).toEqual({
        'x-request-id': 'trace-1',
      });
    });
    it('should return undefined for a packet without user properties (MQTT 3)', () => {
      expect(context.getMetadata()).toBeUndefined();
      expect(
        new MqttContext(['test', { properties: {} }]).getMetadata(),
      ).toBeUndefined();
    });
  });
});
