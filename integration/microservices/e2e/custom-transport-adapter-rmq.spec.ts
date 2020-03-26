import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { RMQCustomTransportAdapterController } from '../src/rmq-custon-transport-adapter/rmq-custom-transport-adapter.controller';
import { customTransportAdapter } from '../src/rmq-custon-transport-adapter/custom-transport-adapter'

describe('custom TransportAdapter', () => {
  let server;
  let app: INestApplication;
  let encryptSpy: sinon.SinonSpy;
  let decryptSpy: sinon.SinonSpy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RMQCustomTransportAdapterController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    encryptSpy = sinon.spy(customTransportAdapter, 'encrypt');
    decryptSpy = sinon.spy(customTransportAdapter, 'decrypt');

    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://0.0.0.0:5672`],
        queue: 'custom-transport-test',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
        transportAdapter: customTransportAdapter,
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`/POST (message)`, async () => {
    await request(server)
      .post('/?command=greet')
      .send({ recipient: 'World' })
      .expect(200, { message: 'Hello World!' });
    expect(encryptSpy.callCount).to.equal(2);
    expect(decryptSpy.callCount).to.equal(2);
  });

  it('/POST (event)', async () => {
    expect(RMQCustomTransportAdapterController.greetingsSent).to.equal(0);
    await request(server)
      .post(`/greeting`)
      .send()
      .expect(201);
    expect(RMQCustomTransportAdapterController.greetingsSent).to.equal(1);
  })

  afterEach(async () => {

    encryptSpy.restore();
    decryptSpy.restore();

    await app.close();
  });
});
