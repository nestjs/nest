import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { NatsController } from '../src/nats/nats.controller';
import { NatsService } from '../src/nats/nats.service';

describe('NATS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NatsController],
      providers: [NatsService],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: 'nats://0.0.0.0:4222',
      },
    });
    await app.startAllMicroservices();
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

  it(`/GET (exception)`, () => {
    return request(server).get('/exception').expect(200, {
      message: 'test',
      status: 'error',
    });
  });

  it(`/POST (event notification)`, done => {
    void request(server)
      .post('/notify')
      .send([1, 2, 3, 4, 5])
      .end(() => {
        setTimeout(() => {
          expect(NatsController.IS_NOTIFIED).to.be.true;
          expect(NatsController.IS_NOTIFIED2).to.be.true;
          done();
        }, 1000);
      });
  });

  it(`/POST (sending headers with "RecordBuilder")`, () => {
    const payload = { items: [1, 2, 3] };
    return request(server)
      .post('/record-builder-duplex')
      .send(payload)
      .expect(200, {
        data: payload,
        headers: {
          ['x-version']: '1.0.0',
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
