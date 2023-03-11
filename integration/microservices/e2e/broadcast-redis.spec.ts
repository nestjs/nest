import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RedisBroadcastController } from '../src/redis/redis-broadcast.controller';

describe('REDIS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RedisBroadcastController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.REDIS,
      options: {
        host: '0.0.0.0',
        port: 6379,
      },
    });
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.REDIS,
      options: {
        host: '0.0.0.0',
        port: 6379,
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`Broadcast (2 subscribers)`, () => {
    return request(server).get('/broadcast').expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
