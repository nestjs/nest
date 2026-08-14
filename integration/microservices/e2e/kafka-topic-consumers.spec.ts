import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { KafkaTopicConsumersController } from '../src/kafka-topic-consumers/kafka-topic-consumers.controller';
import { KafkaTopicConsumersMessagesController } from '../src/kafka-topic-consumers/kafka-topic-consumers.messages.controller';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Skip this test in CI/CD pipeline as it requires a running Kafka broker.
 * Run locally with: npm run test:docker:up && npm run test:integration
 */
describe.skip('Kafka topicConsumers', function () {
  let server: any;
  let app: INestApplication;

  this.timeout(30000);

  before('Start Kafka app with topicConsumers enabled', async () => {
    const module = await Test.createTestingModule({
      controllers: [
        KafkaTopicConsumersController,
        KafkaTopicConsumersMessagesController,
      ],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
        },
        topicConsumers: true,
      },
    });

    app.enableShutdownHooks();
    await app.startAllMicroservices();
    await app.init();
  });

  beforeEach(async () => {
    KafkaTopicConsumersMessagesController.TOPIC_A_PROCESSED = false;
    KafkaTopicConsumersMessagesController.TOPIC_B_PROCESSED = false;
    // ensure topic-a handler is non-blocking before each test
    await request(server).post('/release-a').send();
  });

  it('should process events from both topics', async () => {
    await Promise.all([
      request(server).post('/emit-a').send().expect(200),
      request(server).post('/emit-b').send().expect(200),
    ]);

    await sleep(3000);

    expect(KafkaTopicConsumersMessagesController.TOPIC_A_PROCESSED).to.be.true;
    expect(KafkaTopicConsumersMessagesController.TOPIC_B_PROCESSED).to.be.true;
  });

  it('should process topic-b while topic-a handler is blocking', async () => {
    // Block topic-a handler
    await request(server).post('/block-a').send().expect(200);

    // Emit to topic-a — handler will block until released
    await request(server).post('/emit-a').send().expect(200);

    // Give time for the message to be consumed and the handler to start blocking
    await sleep(2000);

    // Emit to topic-b — with topicConsumers=true this should be processed
    // independently, regardless of topic-a being blocked
    await request(server).post('/emit-b').send().expect(200);

    await sleep(2000);

    // topic-b must be processed despite topic-a still being blocked
    expect(KafkaTopicConsumersMessagesController.TOPIC_B_PROCESSED).to.be.true;
    expect(KafkaTopicConsumersMessagesController.TOPIC_A_PROCESSED).to.be.false;

    // Release topic-a and verify it completes
    await request(server).post('/release-a').send().expect(200);
    await sleep(2000);

    expect(KafkaTopicConsumersMessagesController.TOPIC_A_PROCESSED).to.be.true;
  });

  after('Stop Kafka app', async () => {
    await app.close();
  });
});
