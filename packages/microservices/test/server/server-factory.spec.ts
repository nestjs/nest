import { expect } from 'chai';
import { ServerFactory } from '../../server/server-factory';
import {
  ServerGCPubSub,
  ServerGrpc,
  ServerKafka,
  ServerMqtt,
  ServerNats,
  ServerRedis,
  ServerRMQ,
  ServerTCP,
} from '../../server';
import { Transport } from '../../enums';

describe('ServerFactory', () => {
  describe('create', () => {
    it(`should return tcp server by default`, () => {
      expect(ServerFactory.create({}) instanceof ServerTCP).to.be.true;
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).to.be.true;
    });

    it(`should return mqtt server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.MQTT }) instanceof
          ServerMqtt,
      ).to.be.true;
    });

    it(`should return nats server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.NATS }) instanceof
          ServerNats,
      ).to.be.true;
    });

    it(`should return rmq server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.RMQ }) instanceof ServerRMQ,
      ).to.be.true;
    });

    it(`should return kafka server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.KAFKA }) instanceof
          ServerKafka,
      ).to.be.true;
    });

    it(`should return grpc server`, () => {
      expect(
        ServerFactory.create({
          transport: Transport.GRPC,
          options: { protoPath: '', package: '' },
        }) instanceof ServerGrpc,
      ).to.be.true;
    });

    it(`should return gc pubsub server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.GC_PUBSUB }) instanceof
          ServerGCPubSub,
      ).to.be.true;
    });
  });
});
