import { expect } from 'chai';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';
import { ClientTCP } from '@nestjs/microservices/client/client-tcp';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { ClientRedis } from '@nestjs/microservices/client/client-redis';
import { ClientNats } from '@nestjs/microservices/client/client-nats';
import { ClientMqtt } from '@nestjs/microservices/client/client-mqtt';
import { ClientGrpcProxy } from '@nestjs/microservices/client/client-grpc';
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
          package: 'test'
        },
      });
      expect(proxy instanceof ClientGrpcProxy).to.be.true;
    });
  });
});
