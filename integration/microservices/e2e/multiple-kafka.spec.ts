import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { KafkaMultipleController } from '../src/kafka-multiple/kafka-multiple.controller';
import { KafkaMultipleMessagesController } from '../src/kafka-multiple/kafka-multiple.messages.controller';

describe('Kafka multiple', function () {
  let appServer: any;
  let app: INestApplication;
  let appMS1: INestApplication;
  let appMS2: INestApplication;

  // set timeout to be longer (especially for the after hook)
  this.timeout(30000);

  const startServer = async () => {
    const module = await Test.createTestingModule({
      controllers: [KafkaMultipleController],
    }).compile();

    app = module.createNestApplication();

    appServer = app.getHttpAdapter().getInstance();

    app.enableShutdownHooks();

    await app.init();
  };

  const startMS = async (id: number): Promise<INestApplication> => {
    const module = await Test.createTestingModule({
      controllers: [KafkaMultipleMessagesController],
    }).compile();

    const app = module.createNestApplication();
    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
        },
        consumer: {
          groupId: `group_${id}`,
        },
      },
    });

    app.enableShutdownHooks();
    await app.startAllMicroservicesAsync();
    await app.init();

    return app;
  };

  it('Start Kafka app', async () => {
    await startServer();
    appMS1 = await startMS(1);
    appMS2 = await startMS(2);
  }).timeout(30000);

  it('should receive multiple messages from same topic', () => {
    return request(appServer)
      .post('/mathPlusOne')
      .send({ value: 2 })
      .expect(200)
      .expect(200, [3, 3]);
  });

  after(`Stopping Kafka app`, async () => {
    await app.close();
    await appMS1.close();
    await appMS2.close();
  });
});
