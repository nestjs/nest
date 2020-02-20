import { expect } from 'chai';
import { KafkaContext } from '../../ctx-host';
import { KafkaMessage } from '../../external/kafka.interface';

describe('KafkaContext', () => {
  const args = ['test', { test: true }];
  let context: KafkaContext;

  beforeEach(() => {
    context = new KafkaContext(args as [KafkaMessage, number, string]);
  });
  describe('getTopic', () => {
    it('should return topic', () => {
      expect(context.getTopic()).to.be.eql(args[2]);
    });
  });
  describe('getPartition', () => {
    it('should return partition', () => {
      expect(context.getPartition()).to.be.eql(args[1]);
    });
  });
  describe('getMessage', () => {
    it('should return original message', () => {
      expect(context.getMessage()).to.be.eql(args[0]);
    });
  });
});
