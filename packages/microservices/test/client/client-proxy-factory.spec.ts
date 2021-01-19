import { expect } from 'chai';
import {
  ClientGCPubSub,
  ClientGrpcProxy,
  ClientKafka,
  ClientMqtt,
  ClientNats,
  ClientProxyFactory,
  ClientRedis,
  ClientRMQ,
  ClientTCP,
} from '../../client';
import { Transport } from '../../enums';
import { join } from 'path';

describe('ClientProxyFactory', () => {
  describe('create', () => {
    it(`should create tcp client by default`, () => {
      const proxy = ClientProxyFactory.create({});
      expect(proxy instanceof ClientTCP).to.be.true;
    });

    it(`should create redis client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.REDIS });
      expect(proxy instanceof ClientRedis).to.be.true;
    });

    it(`should create nats client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.NATS });
      expect(proxy instanceof ClientNats).to.be.true;
    });

    it(`should create mqtt client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.MQTT });
      expect(proxy instanceof ClientMqtt).to.be.true;
    });

    it(`should create grpc client`, () => {
      const proxy = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          protoPath: join(__dirname, './test.proto'),
          package: 'test',
        },
      });
      expect(proxy instanceof ClientGrpcProxy).to.be.true;
    });

    it(`should create rmq client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.RMQ });
      expect(proxy instanceof ClientRMQ).to.be.true;
    });

    it(`should create kafka client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.KAFKA });
      expect(proxy instanceof ClientKafka).to.be.true;
    });

    it(`should create google pubsub client`, () => {
      const proxy = ClientProxyFactory.create({
        transport: Transport.GC_PUBSUB,
      });
      expect(proxy instanceof ClientGCPubSub).to.be.true;
    });
  });
});
