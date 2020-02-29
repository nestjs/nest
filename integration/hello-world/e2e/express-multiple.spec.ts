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
      module1.createNestApplication(adapter).setGlobalPrefix('app1'),
      module2.createNestApplication(adapter).setGlobalPrefix('/app2'),
    ];
    await Promise.all(apps.map(app => app.init()));

    server = adapter.getInstance();
  });

  it(`/GET (app1)`, () => {
    return request(server)
      .get('/app1/hello')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2)`, () => {
    return request(server)
      .get('/app2/hello')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app1 Promise/async)`, () => {
    return request(server)
      .get('/app1/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Promise/async)`, () => {
    return request(server)
      .get('/app2/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app1 Observable stream)`, () => {
    return request(server)
      .get('/app1/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Observable stream)`, () => {
    return request(server)
      .get('/app2/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app1 NotFound)`, () => {
    return request(server)
      .get('/app1/cats')
      .expect(404)
      .expect({
        statusCode: 404,
        error: 'Not Found',
        message: 'Cannot GET /cats',
      });
  });

  it(`/GET (app2 NotFound)`, () => {
    return request(server)
      .get('/app2/cats')
      .expect(404)
      .expect({
        statusCode: 404,
        error: 'Not Found',
        message: 'Cannot GET /cats',
      });
  });

  afterEach(async () => {
    await Promise.all(apps.map(app => app.close()));
  });
});
