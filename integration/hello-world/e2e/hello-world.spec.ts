import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ApplicationModule } from '../src/app.module';

describe('Hello world (default adapter)', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  describe('/GET', () => {
    it(`should return "Hello world!"`, () => {
      return request(server)
        .get('/hello')
        .expect(200)
        .expect('Hello world!');
    });

    it(`should attach response header`, () => {
      return request(server)
        .get('/hello')
        .expect(200)
        .expect('Authorization', 'Bearer');
    });
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

  afterEach(async () => {
    await app.close();
  });
});
