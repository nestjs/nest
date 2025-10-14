import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RMQFanoutExchangeProducerController } from '../src/rmq/fanout-exchange-producer-rmq.controller';
import { RMQFanoutExchangeConsumerController } from '../src/rmq/fanout-exchange-consumer-rmq.controller';

describe('RabbitMQ transport (Fanout Exchange)', () => {
  let server: any;
  let appProducer: INestApplication;
  let appConsumer: INestMicroservice;

  beforeEach(async () => {
    const producerModule = await Test.createTestingModule({
      controllers: [RMQFanoutExchangeProducerController],
    }).compile();
    const consumerModule = await Test.createTestingModule({
      controllers: [RMQFanoutExchangeConsumerController],
    }).compile();

    appProducer = producerModule.createNestApplication();
    server = appProducer.getHttpAdapter().getInstance();

    appConsumer = consumerModule.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://0.0.0.0:5672`],
        queue: '',
        exchange: 'test.fanout',
        exchangeType: 'fanout',
        queueOptions: {
          exclusive: true,
        },
      },
    });
    await Promise.all([appProducer.init(), appConsumer.listen()]);
  });

  it(`should send message to fanout exchange`, async () => {
    await request(server).get('/fanout-exchange').expect(200, 'ping/pong');
  });

  afterEach(async () => {
    await Promise.all([appProducer.close(), appConsumer.close()]);
  });
});
