import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { GCPubSubBroadcastController } from '../src/gc-pubsub/gc-pubsub-broadcast.controller';

describe('GC_PUBSUB transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GCPubSubBroadcastController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.GC_PUBSUB,
      options: {
        subscription: 'default_subscription',
        client: {
          apiEndpoint: 'localhost:8681',
          projectId: 'microservice',
        },
      },
    });
    app.connectMicroservice({
      transport: Transport.GC_PUBSUB,
      options: {
        subscription: 'default_subscription2',
        client: {
          apiEndpoint: 'localhost:8681',
          projectId: 'microservice',
        },
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`Broadcast (2 subscribers)`, () => {
    return request(server).get('/broadcast').expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
