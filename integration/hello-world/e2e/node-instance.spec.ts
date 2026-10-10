import { INestApplication } from '@nestjs/common';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

describe('Hello world (node adapter instance)', () => {
  let server: App;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication(new NodeAdapter());
    server = app.getHttpServer();
    await listenOnLoopback(app);
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

  it('/HEAD should respond to with a 200', () => {
    return request(server).head('/hello').expect(200);
  });

  it('serves requests through the router instance alone', () => {
    // The instance is a request listener, like an Express application, so it
    // can be mounted on another server (serverless handlers, tests)
    const router = app.getHttpAdapter().getInstance();
    return request(router).get('/hello').expect(200).expect('Hello world!');
  });

  afterEach(async () => {
    await app.close();
  });
});
