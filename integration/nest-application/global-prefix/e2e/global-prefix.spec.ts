import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import {
  AppModule,
  MIDDLEWARE_PARAM_VALUE,
  MIDDLEWARE_VALUE,
} from '../src/app.module';

describe('Global prefix', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
  });

  it(`should use the global prefix`, async () => {
    app.setGlobalPrefix('/api/v1');

    server = app.getHttpServer();
    await app.init();

    await request(server).get('/health').expect(404);

    await request(server).get('/api/v1/health').expect(200);
  });

  it(`should exclude the path as string`, async () => {
    app.setGlobalPrefix('/api/v1', { exclude: ['/test', '/middleware'] });

    server = app.getHttpServer();
    await app.init();
    await request(server).get('/test').expect(200);
    await request(server).post('/test').expect(201);

    await request(server).get('/api/v1/test').expect(404);
    await request(server).post('/api/v1/test').expect(404);

    await request(server).get('/middleware').expect(200, MIDDLEWARE_VALUE);
    await request(server).post('/middleware').expect(201, MIDDLEWARE_VALUE);

    await request(server).get('/api/v1/middleware').expect(404);
    await request(server).post('/api/v1/middleware').expect(404);
  });

  it(`should exclude the path as RouteInfo`, async () => {
    app.setGlobalPrefix('/api/v1', {
      exclude: [
        { path: '/health', method: RequestMethod.GET },
        { path: '/middleware', method: RequestMethod.POST },
      ],
    });

    server = app.getHttpServer();
    await app.init();

    await request(server).get('/health').expect(200);

    await request(server).get('/middleware').expect(404);
    await request(server).post('/middleware').expect(201, MIDDLEWARE_VALUE);

    await request(server).get('/api/v1/health').expect(404);

    await request(server)
      .get('/api/v1/middleware')
      .expect(200, MIDDLEWARE_VALUE);
    await request(server).post('/api/v1/middleware').expect(404);
  });

  it(`should only exclude the GET RequestMethod`, async () => {
    app.setGlobalPrefix('/api/v1', {
      exclude: [{ path: '/test', method: RequestMethod.GET }],
    });

    server = app.getHttpServer();
    await app.init();

    await request(server).get('/test').expect(200);

    await request(server).post('/test').expect(404);

    await request(server).post('/api/v1/test').expect(201);
  });

  it(`should exclude the path as a mix of string and RouteInfo`, async () => {
    app.setGlobalPrefix('/api/v1', {
      exclude: ['test', { path: '/health', method: RequestMethod.GET }],
    });

    server = app.getHttpServer();
    await app.init();

    await request(server).get('/health').expect(200);

    await request(server).get('/test').expect(200);
  });

  it(`should exclude the path with route param`, async () => {
    app.setGlobalPrefix('/api/v1', {
      exclude: ['/hello/:name', '/middleware/:name'],
    });

    server = app.getHttpServer();
    await app.init();

    await request(server)
      .get('/hello/foo')
      .expect(200, 'Hello: Data attached in middleware');

    await request(server)
      .get('/middleware/foo')
      .expect(200, MIDDLEWARE_PARAM_VALUE);

    await request(server).get('/api/v1/middleware/foo').expect(404);
  });

  it(`should get the params in the global prefix`, async () => {
    app.setGlobalPrefix('/api/:tenantId');

    server = app.getHttpServer();
    await app.init();

    await request(server)
      .get('/api/test/params')
      .expect(200, { '0': 'params', tenantId: 'test' });
  });

  afterEach(async () => {
    await app.close();
  });
});
