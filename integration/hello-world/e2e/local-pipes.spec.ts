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

  it(`should execute locally injected pipe`, () => {
    return request(server)
      .get('/hello/local-pipe/1')
      .expect(200)
      .expect({
        id: '1',
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
