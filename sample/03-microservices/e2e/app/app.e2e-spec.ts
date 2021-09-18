import { INestApplication, INestMicroservice } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { MathModule } from '../../src/math/math.module';

async function createPublisherApp() {
  const fixture: TestingModule = await Test.createTestingModule({
    imports: [MathModule],
  }).compile();

  const app = fixture.createNestApplication();

  await app.init();

  await app.startAllMicroservicesAsync();

  return app;
}

async function createSubscriberApp() {
  const fixture: TestingModule = await Test.createTestingModule({
    imports: [MathModule],
  }).compile();

  const app = fixture.createNestMicroservice({
    transport: Transport.TCP,
  });

  await app.listenAsync();

  return app;
}

describe('Math', () => {
  let publisherApp: INestApplication;
  let subscriberApp: INestMicroservice;

  beforeEach(async () => {
    [publisherApp, subscriberApp] = await Promise.all([
      createPublisherApp(),
      createSubscriberApp(),
    ]);
  });

  afterEach(async () => {
    await Promise.all([publisherApp.close(), subscriberApp.close()]);
  });

  it(`make call to publisher should trigger subscriber`, async () => {
    const response = await request(publisherApp.getHttpServer())
      .get('/')
      .expect(200)
      .then(res => res.text);

    expect(response).toBe('15');
  });
});
