import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MqttBroadcastController } from '../src/mqtt/mqtt-broadcast.controller';

describe('MQTT transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MqttBroadcastController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.MQTT,
    });
    app.connectMicroservice({
      transport: Transport.MQTT,
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
