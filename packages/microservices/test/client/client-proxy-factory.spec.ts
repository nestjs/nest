import { join } from 'path';
import { ClientGrpcProxy } from '../../client/client-grpc.js';
import { ClientKafka } from '../../client/client-kafka.js';
import { ClientMqtt } from '../../client/client-mqtt.js';
import { ClientNats } from '../../client/client-nats.js';
import { ClientProxyFactory } from '../../client/client-proxy-factory.js';
import { ClientRedis } from '../../client/client-redis.js';
import { ClientRMQ } from '../../client/client-rmq.js';
import { ClientTCP } from '../../client/client-tcp.js';
import { Transport } from '../../enums/transport.enum.js';

describe('ClientProxyFactory', () => {
  describe('create', () => {
    it(`should create tcp client by default`, () => {
      const proxy = ClientProxyFactory.create({});
      expect(proxy instanceof ClientTCP).toBe(true);
    });

    it(`should create redis client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.REDIS });
      expect(proxy instanceof ClientRedis).toBe(true);
    });

    it(`should create nats client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.NATS });
      expect(proxy instanceof ClientNats).toBe(true);
    });

    it(`should create mqtt client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.MQTT });
      expect(proxy instanceof ClientMqtt).toBe(true);
    });

    it(`should create grpc client`, () => {
      const proxy = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          protoPath: join(import.meta.dirname, './test.proto'),
          package: 'test',
        },
      });
      expect(proxy instanceof ClientGrpcProxy).toBe(true);
    });

    it(`should create rmq client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.RMQ });
      expect(proxy instanceof ClientRMQ).toBe(true);
    });

    it(`should create kafka client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.KAFKA });
      expect(proxy instanceof ClientKafka).toBe(true);
    });
  });
});
