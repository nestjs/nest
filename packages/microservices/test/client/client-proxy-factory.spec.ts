import { ClientProxyFactory } from '../../client/client-proxy-factory';
import { ClientTCP } from '../../client/client-tcp';
import { Transport } from '../../enums/transport.enum';
import { ClientRedis } from '../../client/client-redis';
import { ClientNats } from '../../client/client-nats';
import { ClientMqtt } from '../../client/client-mqtt';
import { ClientGrpcProxy } from '../../client/client-grpc';
import { ClientRMQ } from '../../client/client-rmq';
import { ClientKafka } from '../../client/client-kafka';
import { join } from 'path';

describe('ClientProxyFactory', () => {
  describe('create', () => {
    it(`should create tcp client by default`, () => {
      const proxy = ClientProxyFactory.create({});
      expect(proxy instanceof ClientTCP).toBeTruthy();
    });

    it(`should create redis client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.REDIS });
      expect(proxy instanceof ClientRedis).toBeTruthy();
    });

    it(`should create nats client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.NATS });
      expect(proxy instanceof ClientNats).toBeTruthy();
    });

    it(`should create mqtt client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.MQTT });
      expect(proxy instanceof ClientMqtt).toBeTruthy();
    });

    it(`should create grpc client`, () => {
      const proxy = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          protoPath: join(__dirname, './test.proto'),
          package: 'test',
        },
      });
      expect(proxy instanceof ClientGrpcProxy).toBeTruthy();
    });

    it(`should create rmq client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.RMQ });
      expect(proxy instanceof ClientRMQ).toBeTruthy();
    });

    it(`should create kafka client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.KAFKA });
      expect(proxy instanceof ClientKafka).toBeTruthy();
    });
  });
});
