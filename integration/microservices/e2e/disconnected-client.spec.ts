import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { join } from 'path';
import { DisconnectedClientController } from '../src/disconnected.controller';
import { Transport } from '@nestjs/microservices';

describe('Disconnected client', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DisconnectedClientController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    await app.init();
  });

  it(`TCP`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.TCP,
      })
      .expect(408);
  });

  it(`REDIS`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.REDIS,
        options: {
          url: 'redis://localhost:3333',
        },
      })
      .expect(408);
  });

  it(`NATS`, () => {
    return request(server)
      .post('/')
      .send({
        transport: Transport.NATS,
        options: {
          url: 'nats://localhost:4224',
        },
      })
      .expect(408);
  });

  afterEach(async () => {
    await app.close();
  });
});
