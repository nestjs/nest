import { expect } from 'chai';
import { ServerFactory } from '../../server/server-factory';
import { ServerTCP } from '../../server/server-tcp';
import { ServerRedis } from '../../server/server-redis';
import { Transport } from '../../enums/transport.enum';
import { ServerMqtt } from '../../server/server-mqtt';
import { ServerNats } from '../../server/server-nats';
import { ServerGrpc } from '../../server/server-grpc';

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

    it(`should return grpc server`, () => {
      expect(
        ServerFactory.create({
          transport: Transport.GRPC,
          options: { protoPath: '', package: '' },
        }) instanceof ServerGrpc,
      ).to.be.true;
    });
  });
});
