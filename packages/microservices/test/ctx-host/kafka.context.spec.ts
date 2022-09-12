import { expect } from 'chai';
import { KafkaContext } from '../../ctx-host';
import {
  Consumer,
  KafkaMessage,
  Producer,
} from '../../external/kafka.interface';

describe('KafkaContext', () => {
  const args = [
    'test',
    { test: true },
    undefined,
    { test: 'consumer' },
    () => {},
    { test: 'producer' },
  ];
  let context: KafkaContext;

  beforeEach(() => {
    context = new KafkaContext(
      args as [
        KafkaMessage,
        number,
        string,
        Consumer,
        () => Promise<void>,
        Producer,
      ],
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
  describe('getConsumer', () => {
    it('should return consumer instance', () => {
      expect(context.getConsumer()).to.deep.eq({ test: 'consumer' });
    });
  });
  describe('getHeartbeat', () => {
    it('should return heartbeat callback', () => {
      expect(context.getHeartbeat()).to.be.eql(args[4]);
    });
  });
  describe('getProducer', () => {
    it('should return producer instance', () => {
      expect(context.getProducer()).to.deep.eq({ test: 'producer' });
    });
  });
});
