import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MqttController } from '../src/mqtt/mqtt.controller.js';

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
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST`, () => {
    return request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, () => {
    return request(server)
      .post('/?command=asyncSum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, () => {
    return request(server)
      .post('/?command=streamSum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (concurrent)`, function () {
    return request(server)
      .post('/concurrent')
      .send([
        Array.from({ length: 10 }, (v, k) => k + 1),
        Array.from({ length: 10 }, (v, k) => k + 11),
        Array.from({ length: 10 }, (v, k) => k + 21),
        Array.from({ length: 10 }, (v, k) => k + 31),
        Array.from({ length: 10 }, (v, k) => k + 41),
        Array.from({ length: 10 }, (v, k) => k + 51),
        Array.from({ length: 10 }, (v, k) => k + 61),
        Array.from({ length: 10 }, (v, k) => k + 71),
        Array.from({ length: 10 }, (v, k) => k + 81),
        Array.from({ length: 10 }, (v, k) => k + 91),
      ])
      .expect(200, 'true');
  });

  it(`/POST (streaming)`, () => {
    return request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (event notification)`, () =>
    new Promise<void>(done => {
      void request(server)
        .post('/notify')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_NOTIFIED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard EVENT #)`, () =>
    new Promise<void>(done => {
      void request(server)
        .post('/wildcard-event')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_WILDCARD_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard MESSAGE #)`, () => {
    return request(server)
      .post('/wildcard-message')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (wildcard EVENT +)`, () =>
    new Promise<void>(done => {
      void request(server)
        .post('/wildcard-event2')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_WILDCARD2_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard MESSAGE +)`, () => {
    return request(server)
      .post('/wildcard-message2')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (shared wildcard EVENT #)`, () =>
    new Promise<void>(done => {
      void request(server)
        .post('/shared-wildcard-event')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (shared wildcard MESSAGE #)`, () => {
    return request(server)
      .post('/shared-wildcard-message')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (shared wildcard EVENT +)`, () =>
    new Promise<void>(done => {
      void request(server)
        .post('/shared-wildcard-event2')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_SHARED_WILDCARD2_EVENT_RECEIVED).toBe(
              true,
            );
            done();
          }, 1000);
        });
    }));

  it(`/POST (shared wildcard MESSAGE +)`, () => {
    return request(server)
      .post('/shared-wildcard-message2')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  afterEach(async () => {
    await app.close();
  });
});
