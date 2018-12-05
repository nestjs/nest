import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DisconnectedClientController } from '../src/disconnected.controller';

describe('Disconnected client', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DisconnectedClientController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    await app.init();
  });

  it(`TCP`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.TCP,
      })
      .expect(408);
  });

  it(`REDIS`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.REDIS,
        options: {
          url: 'redis://localhost:3333',
        },
      })
      .expect(408);
  });

  it(`NATS`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.NATS,
        options: {
          url: 'nats://localhost:4224',
        },
      })
      .expect(408);
  });

  it(`MQTT`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.MQTT,
        options: {
          host: 'mqtt://broker.hivemq.com',
          port: 183,
        },
      })
      .expect(408);
  });

  afterEach(async () => {
    await app.close();
  });
});
