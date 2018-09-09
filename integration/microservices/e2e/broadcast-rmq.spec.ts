import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { RMQController } from '../src/rmq/rmq.controller';
import { RMQBroadcastController } from '../src/rmq/rmq-broadcast.controller';

describe('RabbitMQ transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RMQBroadcastController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://admin:admin@localhost`],
        queue: 'test',
        queueOptions: { durable: false },
      },
    });
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://admin:admin@localhost`],
        queue: 'test',
        queueOptions: { durable: false },
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`Broadcast (2 subscribers)`, () => {
    return request(server)
      .get('/broadcast')
      .expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
