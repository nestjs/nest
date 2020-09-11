import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { StanBroadcastController } from '../src/stan/stan-broadcast.controller';

describe('STAN transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StanBroadcastController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.STAN,
      options: {
        url: 'nats://0.0.0.0:4223',
      },
    });
    app.connectMicroservice({
      transport: Transport.STAN,
      options: {
        url: 'nats://0.0.0.0:4223',
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
