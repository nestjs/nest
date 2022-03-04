import { expect } from 'chai';
import * as sinon from 'sinon';
import { KafkaContext } from '../../ctx-host';
import { KafkaMessage } from '../../external/kafka.interface';

describe('KafkaContext', () => {
  const testFunc = sinon.spy();
  const args = ['test', { test: true }, undefined, testFunc];
  let context: KafkaContext;

  beforeEach(() => {
    context = new KafkaContext(
      args as [KafkaMessage, number, string, () => Promise<void>],
    );
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
  describe('commitOffset', () => {
    it('should be called once', () => {
      context.commitOffset();
      expect(testFunc.called).to.be.true;
    });
  });
});
