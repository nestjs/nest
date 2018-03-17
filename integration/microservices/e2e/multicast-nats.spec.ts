import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { NatsMulticastController } from '../src/nats/nats-multicast.controller';

describe('NATS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NatsMulticastController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.NATS,
      url: 'nats://localhost:4222'
    });
    app.connectMicroservice({
      transport: Transport.NATS,
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`Multicast (2 subscribers)`, () => {
    return request(server)
      .get('/multicast')
      .expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
