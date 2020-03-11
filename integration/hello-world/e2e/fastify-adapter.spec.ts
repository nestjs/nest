import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { fail } from 'assert';
import { expect } from 'chai';
import { ApplicationModule } from '../src/app.module';

describe('Hello world (fastify adapter)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
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
      .then(
        ({ payload }) => {
          fail(`Unexpected success: ${payload}`);
        },
        err => {
          expect(err.getResponse()).to.be.eql({
            message: 'Internal Server Error',
            error:
              'HTTP adapter does not support filtering on host: ":tenant.example.com"',
            statusCode: 500,
          });
        },
      );
  });

  afterEach(async () => {
    await app.close();
  });
});
