import { KafkaContext } from '../../ctx-host/index.js';
import {
  Consumer,
  KafkaMessage,
  Producer,
} from '../../external/kafka.interface.js';

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
      expect(context.getTopic()).toEqual(args[2]);
    });
  });
  describe('getPartition', () => {
    it('should return partition', () => {
      expect(context.getPartition()).toEqual(args[1]);
    });
  });
  describe('getMessage', () => {
    it('should return original message', () => {
      expect(context.getMessage()).toEqual(args[0]);
    });
  });
  describe('getConsumer', () => {
    it('should return consumer instance', () => {
      expect(context.getConsumer()).toEqual({ test: 'consumer' });
    });
  });
  describe('getHeartbeat', () => {
    it('should return heartbeat callback', () => {
      expect(context.getHeartbeat()).toEqual(args[4]);
    });
  });
  describe('getProducer', () => {
    it('should return producer instance', () => {
      expect(context.getProducer()).toEqual({ test: 'producer' });
    });
  });
});
