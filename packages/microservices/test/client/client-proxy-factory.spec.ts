import { expect } from 'chai';
import { join } from 'path';
import { ClientGrpcProxy } from '../../client/client-grpc';
import { ClientKafka } from '../../client/client-kafka';
import { ClientMqtt } from '../../client/client-mqtt';
import { ClientNats } from '../../client/client-nats';
import { ClientProxyFactory } from '../../client/client-proxy-factory';
import { ClientRedis } from '../../client/client-redis';
import { ClientRMQ } from '../../client/client-rmq';
import { ClientStan } from '../../client/client-stan';
import { ClientTCP } from '../../client/client-tcp';
import { Transport } from '../../enums/transport.enum';

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

    it(`should create stan client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.STAN });
      expect(proxy instanceof ClientStan).to.be.true;
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
  });
});
