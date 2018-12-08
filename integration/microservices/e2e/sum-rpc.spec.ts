import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

describe('RPC transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.TCP,
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`/POST`, () => {
    return request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, () => {
    return request(server)
      .post('/?command=asyncSum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, () => {
    return request(server)
      .post('/?command=streamSum')
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

  it(`/POST (streaming)`, () => {
    return request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (pattern not found)`, () => {
    return request(server)
      .post('/?command=test')
      .expect(500);
  });

  afterEach(async () => {
    await app.close();
  });
});
