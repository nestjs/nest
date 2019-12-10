import { expect } from 'chai';
import { MqttContext } from '../../ctx-host';

describe('MqttContext', () => {
  const args = ['test', { test: true }];
  let context: MqttContext;

  beforeEach(() => {
    context = new MqttContext(args as [string, Record<string, any>]);
  });
  describe('getTopic', () => {
    it('should return topic', () => {
      expect(context.getTopic()).to.be.eql(args[0]);
    });
  });
  describe('getPacket', () => {
    it('should return packet', () => {
      expect(context.getPacket()).to.be.eql(args[1]);
    });
  });
});
