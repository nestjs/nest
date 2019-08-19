import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { KafkaController } from '../src/kafka/kafka.controller';

describe('Kafka transport', () => {
  let server;
  let app: INestApplication;

  it(`Start Kafka app`, async () => {
    const module = await Test.createTestingModule({
      controllers: [KafkaController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
        },
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  }).timeout(30000);

  it(`/POST (async command sum)`, () => {
    return request(server)
      .post('/?command=math.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  }).timeout(50000);

  // it(`/POST (async command sum)`, done => {
  //   request(server)
  //     .post('/?command=math.sum')
  //     .send([1, 2, 3, 4, 5])
  //     .end(() => {
  //       setTimeout(() => {
  //         expect(KafkaController.MATH_SUM).to.eq(15);
  //         done();
  //       }, 4000);
  //     });
  // }).timeout(5000);

  it(`/POST (async event notification)`, done => {
    request(server)
      .post('/notify')
      .send([1, 2, 3, 4, 5])
      .end(() => {
        setTimeout(() => {
          expect(KafkaController.IS_NOTIFIED).to.be.true;
          done();
        }, 4000);
      });
  }).timeout(5000);

  after(`Stopping Kafka app`, async () => {
    await app.close();
  });
}).timeout(30000);
