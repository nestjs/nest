import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';

describe('Hello world (express instance with multiple applications)', () => {
  let server;
  let apps: INestApplication[];

  beforeEach(async () => {
    const module1 = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();
    const module2 = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    const adapter = new ExpressAdapter(express());

    apps = [
      module1.createNestApplication(adapter),
      module2.createNestApplication(adapter).setGlobalPrefix('/app2'),
    ];
    await Promise.all(apps.map(app => app.init()));

    server = adapter.getInstance();
  });

  it(`/GET`, () => {
    return request(server).get('/hello').expect(200).expect('Hello world!');
  });

  it(`/GET (app2)`, () => {
    return request(server)
      .get('/app2/hello')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (Promise/async)`, () => {
    return request(server)
      .get('/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Promise/async)`, () => {
    return request(server)
      .get('/app2/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (Observable stream)`, () => {
    return request(server)
      .get('/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Observable stream)`, () => {
    return request(server)
      .get('/app2/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  afterEach(async () => {
    await Promise.all(apps.map(app => app.close()));
  });
});
