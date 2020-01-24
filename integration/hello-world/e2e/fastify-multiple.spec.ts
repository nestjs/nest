import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
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

    adapter = new FastifyAdapter();

    apps = [
      module1.createNestApplication<NestFastifyApplication>(adapter),
      module2
        .createNestApplication<NestFastifyApplication>(adapter)
        .setGlobalPrefix('/app2'),
    ];
    await Promise.all(apps.map(app => app.init()));
  });

  it(`/GET`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/hello',
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

  it(`/GET (Promise/async)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/hello/async',
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

  it(`/GET (Observable stream)`, () => {
    return adapter
      .inject({
        method: 'GET',
        url: '/hello/stream',
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

  afterEach(async () => {
    await Promise.all(apps.map(app => app.close()));
    await adapter.close();
  });
});
