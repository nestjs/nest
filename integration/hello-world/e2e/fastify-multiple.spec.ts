import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { fail } from 'assert';
import { ApplicationModule } from '../src/app.module';

describe('Hello world (fastify adapter with multiple applications)', () => {
  let adapter: FastifyAdapter;
  let apps: NestFastifyApplication[];

  beforeEach(async () => {
    const module1 = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();
    const module2 = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();
    const module3 = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    adapter = new FastifyAdapter();

    apps = [
      module1.createNestApplication<NestFastifyApplication>(adapter).setGlobalPrefix('app1'),
      module2
        .createNestApplication<NestFastifyApplication>(adapter, {
          bodyParser: false,
        })
        .setGlobalPrefix('/app2'),
      module3.createNestApplication<NestFastifyApplication>(adapter),
    ];
    await Promise.all(apps.map(app => app.init()));
  });

  it(`/GET (app1)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app1/hello',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app2)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app2/hello',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app1 Promise/async)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app1/hello/async',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app2 Promise/async)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app2/hello/async',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app1 Observable stream)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app1/hello/stream',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app2 Observable stream)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app2/hello/stream',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (app1 NotFound)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app1/cats',
      })
      .then(
        ({ payload }) => {
          expect(payload).to.be.eql(JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Cannot GET /app1/cats',
          }));
        },
      );
  });

  it(`/GET (app2 NotFound)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app2/cats',
      })
      .then(
        ({ payload }) => {
         expect(payload).to.be.eql(JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Cannot GET /app2/cats',
          }));
        },
      );
  });

  it(`/GET (app3 NotFound)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/app3/cats',
      })
      .then(
        ({ payload }) => {
         expect(payload).to.be.eql(JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Cannot GET /app3/cats',
          }));
        },
      );
  });

  afterEach(async () => {
    await Promise.all(apps.map(app => app.close()));
    await adapter.close();
  });
});
