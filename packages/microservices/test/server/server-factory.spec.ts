import { expect } from 'chai';
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
      expect(ServerFactory.create({}) instanceof ServerTCP).to.be.true;
    });

    it(`should return redis server`, () => {
      expect(
        ServerFactory.create({ transport: Transport.REDIS }) instanceof
          ServerRedis,
      ).to.be.true;
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

    it(`should return redis server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.REDIS,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerRedis).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });

    it(`should return mqtt server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.MQTT,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerMqtt).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });

    it(`should return nats server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.NATS,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerNats).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });

    it(`should return rmq server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.RMQ,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerRMQ).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });

    it(`should return kafka server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.KAFKA,
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerKafka).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });

    it(`should return grpc server with specific transport id`, () => {
      const transportId = Symbol('test');
      const server = ServerFactory.create({
        transport: Transport.GRPC,
        options: { protoPath: '', package: '' },
      });
      server.setTransportId(transportId);

      expect(server instanceof ServerGrpc).to.be.true;
      expect(server.transportId === transportId).to.be.true;
    });
  });
});
