import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RMQTopicExchangeController } from '../src/rmq/topic-exchange-rmq.controller';

describe('RabbitMQ transport (Topic Exchange - wildcards)', () => {
  let server: any;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RMQTopicExchangeController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://0.0.0.0:5672`],
        queue: 'test2',
        wildcards: true,
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`should send message to wildcard topic exchange`, () => {
    return request(server).get('/topic-exchange').expect(200, 'wildcard.a.b');
  });

  afterEach(async () => {
    await app.close();
  });
});
