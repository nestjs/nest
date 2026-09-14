import { ArgumentsHost, HttpException, INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import express from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Hello world (express instance with multiple applications)', () => {
  let server;
  let apps: INestApplication[];

  beforeEach(async () => {
    const module1 = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const module2 = await Test.createTestingModule({
      imports: [AppModule],
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

describe('Hello world (express not-found handler ownership)', () => {
  const apps: INestApplication[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  const createApplication = async (
    adapter: ExpressAdapter,
    handledBy: string,
    prefix?: string,
  ) => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication(adapter);
    apps.push(app);
    if (prefix !== undefined) {
      app.setGlobalPrefix(prefix);
    }
    app.useGlobalFilters({
      catch(exception: HttpException, host: ArgumentsHost) {
        host
          .switchToHttp()
          .getResponse()
          .status(exception.getStatus())
          .json({ handledBy });
      },
    });
    await app.init();
    return app;
  };

  it.each(['api', '/api'])(
    'preserves routes and not-found ownership with prefix %s',
    async prefix => {
      const adapter = new ExpressAdapter();
      await createApplication(adapter, 'root');
      await createApplication(adapter, 'prefixed', prefix);
      const server = adapter.getInstance();

      await request(server)
        .get('/api/hello')
        .expect(200)
        .expect('Hello world!');
      await request(server).get('/hello').expect(200).expect('Hello world!');
      await request(server)
        .get('/api/missing')
        .expect(404)
        .expect({ handledBy: 'prefixed' });
      await request(server)
        .get('/apiary/missing')
        .expect(404)
        .expect({ handledBy: 'root' });
    },
  );
});
