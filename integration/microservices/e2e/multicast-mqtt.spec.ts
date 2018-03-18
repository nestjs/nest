import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { MqttMulticastController } from '../src/mqtt/mqtt-multicast.controller';

describe('MQTT transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MqttMulticastController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.MQTT,
    });
    app.connectMicroservice({
      transport: Transport.MQTT,
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
