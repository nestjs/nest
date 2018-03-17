import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { RedisController } from '../src/redis/redis.controller';
import { RedisMulticastController } from '../src/redis/redis-multicast.controller';

describe('REDIS transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RedisMulticastController],
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

  it(`Multicast (2 subscribers)`, () => {
    return request(server)
      .get('/multicast')
      .expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
