import { expect } from 'chai';
import { ServerFactory } from '@nestjs/microservices/server/server-factory';
import { ServerTCP } from '@nestjs/microservices/server/server-tcp';
import { ServerRedis } from '@nestjs/microservices/server/server-redis';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { ServerMqtt } from '@nestjs/microservices/server/server-mqtt';
import { ServerNats } from '@nestjs/microservices/server/server-nats';
import { ServerGrpc } from '@nestjs/microservices/server/server-grpc';

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
