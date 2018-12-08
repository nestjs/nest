import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';
import { NatsController } from '../src/nats/nats.controller';

describe('NATS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NatsController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        url: 'nats://localhost:4222',
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`/POST`, () => {
    return request(server)
      .post('/?command=math.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, () => {
    return request(server)
      .post('/?command=async.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, () => {
    return request(server)
      .post('/?command=stream.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (streaming)`, () => {
    return request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (concurrent)`, () => {
    return request(server)
      .post('/concurrent')
      .send([
        Array.from({ length: 10 }, (v, k) => k + 1),
        Array.from({ length: 10 }, (v, k) => k + 11),
        Array.from({ length: 10 }, (v, k) => k + 21),
        Array.from({ length: 10 }, (v, k) => k + 31),
        Array.from({ length: 10 }, (v, k) => k + 41),
        Array.from({ length: 10 }, (v, k) => k + 51),
        Array.from({ length: 10 }, (v, k) => k + 61),
        Array.from({ length: 10 }, (v, k) => k + 71),
        Array.from({ length: 10 }, (v, k) => k + 81),
        Array.from({ length: 10 }, (v, k) => k + 91),
      ])
      .expect(200, 'true');
  });

  afterEach(async () => {
    await app.close();
  });
});
