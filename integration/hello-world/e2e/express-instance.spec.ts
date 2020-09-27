import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

describe('Hello world (express instance)', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication(new ExpressAdapter(express()));
    server = app.getHttpServer();
    await app.init();
  });

  it(`/GET`, () => {
    return request(server).get('/hello').expect(200).expect('Hello world!');
  });

  it(`/GET (Promise/async)`, () => {
    return request(server)
      .get('/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (Observable stream)`, () => {
    return request(server)
      .get('/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET { host: ":tenant.example.com" } not matched`, () => {
    return request(server).get('/host').expect(404).expect({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /host',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
