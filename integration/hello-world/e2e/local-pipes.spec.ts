import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
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

  it(`host=example.com should execute locally injected pipe by HelloController`, () => {
    return request(server)
      .get('/hello/local-pipe/1')
      .expect(200)
      .expect({
        id: '1',
      });
  });

  it(`host=host.example.com should execute locally injected pipe by HostController`, () => {
    return request(server)
      .get('/host/local-pipe/1')
      .set('Host', 'acme.example.com')
      .expect(200)
      .expect({
        id: '1',
        host: true,
        tenant: 'acme',
      });
  });

  it(`should return 404 for mismatched host`, () => {
    return request(server)
      .get('/host/local-pipe/1')
      .expect(404)
      .expect({
        message: 'Not Found',
        error: 'Cannot GET /host/local-pipe/1',
        statusCode: 404,
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
