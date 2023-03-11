import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MqttController } from '../src/mqtt/mqtt.controller';

describe('MQTT transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MqttController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: 'mqtt://0.0.0.0:1883',
        subscribeOptions: {
          qos: 1,
        },
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST (setting packet options with "RecordBuilder")`, () => {
    const payload = { items: [1, 2, 3] };
    return request(server)
      .post('/record-builder-duplex')
      .send(payload)
      .expect(200, {
        data: payload,
        qos: 1,
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
