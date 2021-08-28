import { Transport } from '../../enums/transport.enum';
import { ServerFactory } from '../../server/server-factory';
import { ServerGrpc } from '../../server/server-grpc';
import { ServerKafka } from '../../server/server-kafka';
import { ServerMqtt } from '../../server/server-mqtt';
import { ServerNats } from '../../server/server-nats';
import { ServerRedis } from '../../server/server-redis';
import { ServerRMQ } from '../../server/server-rmq';
import { ServerTCP } from '../../server/server-tcp';

describe('ServerFactory', () => {
  describe('create', () => {
    it(`should return tcp server by default`, () => {
      expect(ServerFactory.create({}) instanceof ServerTCP).toBeTruthy();
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).toBeTruthy();
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).toBeTruthy();
    });

    it(`should return mqtt server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.MQTT }) instanceof
          ServerMqtt,
      ).toBeTruthy();
    });

    it(`should return nats server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.NATS }) instanceof
          ServerNats,
      ).toBeTruthy();
    });

    it(`should return rmq server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.RMQ }) instanceof ServerRMQ,
      ).toBeTruthy();
    });

    it(`should return kafka server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.KAFKA }) instanceof
          ServerKafka,
      ).toBeTruthy();
    });

    it(`should return grpc server`, () => {
      expect(
        ServerFactory.create({
          transport: Transport.GRPC,
          options: { protoPath: '', package: '' },
        }) instanceof ServerGrpc,
      ).toBeTruthy();
    });
  });
});
