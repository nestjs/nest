import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { RMQController } from '../src/rmq/rmq.controller';

describe('RabbitMQ transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RMQController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://0.0.0.0:5672`],
        queue: 'test',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
      },
    });
    await app.startAllMicroservices();
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

  it(`/POST (event notification)`, done => {
    request(server)
      .post('/notify')
      .send([1, 2, 3, 4, 5])
      .end(() => {
        setTimeout(() => {
          expect(RMQController.IS_NOTIFIED).to.be.true;
          done();
        }, 1000);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
