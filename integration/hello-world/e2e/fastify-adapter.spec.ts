import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';

describe('Hello world (fastify adapter)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
  });

  it(`/GET`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/hello',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (Promise/async)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/hello/async',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (Observable stream)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/hello/stream',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET { host: ":tenant.example.com" } not matched`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/host',
      })
      .then(({ payload }) => {
        expect(JSON.parse(payload)).to.be.eql({
          error: 'Internal Server Error',
          message:
            'HTTP adapter does not support filtering on host: ":tenant.example.com"',
          statusCode: 500,
        });
      });
  });

  it(`/GET { host: [":tenant.example1.com", ":tenant.example2.com"] } not matched`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/host-array',
      })
      .then(({ payload }) => {
        expect(JSON.parse(payload)).to.be.eql({
          error: 'Internal Server Error',
          message:
            'HTTP adapter does not support filtering on hosts: [":tenant.example1.com", ":tenant.example2.com"]',
          statusCode: 500,
        });
      });
  });

  it(`/GET inject with LightMyRequest chaining API`, () => {
    return app
      .inject()
      .get('/hello')
      .end()
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it('/HEAD should respond to with a 200', () => {
    return app
      .inject({
        method: 'HEAD',
        url: '/hello',
      })
      .then(({ statusCode }) => expect(statusCode).to.be.eq(200));
  });

  afterEach(async () => {
    await app.close();
  });
});
