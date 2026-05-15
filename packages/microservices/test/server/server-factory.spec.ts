import { Transport } from '../../enums/transport.enum.js';
import { ServerFactory } from '../../server/server-factory.js';
import { ServerGrpc } from '../../server/server-grpc.js';
import { ServerKafka } from '../../server/server-kafka.js';
import { ServerMqtt } from '../../server/server-mqtt.js';
import { ServerNats } from '../../server/server-nats.js';
import { ServerRedis } from '../../server/server-redis.js';
import { ServerRMQ } from '../../server/server-rmq.js';
import { ServerTCP } from '../../server/server-tcp.js';

describe('ServerFactory', () => {
  describe('create', () => {
    it(`should return tcp server by default`, () => {
      expect(ServerFactory.create({}) instanceof ServerTCP).toBe(true);
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).toBe(true);
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).toBe(true);
    });

    it(`should return mqtt server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.MQTT }) instanceof
          ServerMqtt,
      ).toBe(true);
    });

    it(`should return nats server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.NATS }) instanceof
          ServerNats,
      ).toBe(true);
    });

    it(`should return rmq server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.RMQ }) instanceof ServerRMQ,
      ).toBe(true);
    });

    it(`should return kafka server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.KAFKA }) instanceof
          ServerKafka,
      ).toBe(true);
    });

    it(`should return grpc server`, () => {
      expect(
        ServerFactory.create({
          transport: Transport.GRPC,
          options: { protoPath: '', package: '' },
        }) instanceof ServerGrpc,
      ).toBe(true);
    });

    it(`should return redis server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.REDIS,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerRedis).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });

    it(`should return mqtt server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.MQTT,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerMqtt).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });

    it(`should return nats server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.NATS,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerNats).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });

    it(`should return rmq server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.RMQ,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerRMQ).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });

    it(`should return kafka server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.KAFKA,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerKafka).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });

    it(`should return grpc server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.GRPC,
        options: { protoPath: '', package: '' },
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerGrpc).toBe(true);
      expect(server.transportId === transportId).toBe(true);
    });
  });
});
