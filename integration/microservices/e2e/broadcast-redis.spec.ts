import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { RedisController } from '../src/redis/redis.controller';
import { RedisBroadcastController } from '../src/redis/redis-broadcast.controller';

describe('REDIS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RedisBroadcastController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.REDIS,
    });
    app.connectMicroservice({
      transport: Transport.REDIS,
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
