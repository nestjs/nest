import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { RawServerDefault } from 'fastify';
import * as request from 'supertest';
import { ErrorsController } from '../src/errors/errors.controller';

describe('Error messages', () => {
  let server: RawServerDefault;

  describe('Express', () => {
    let app: INestApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
      }).compile();

      app = module.createNestApplication();
      server = app.getHttpServer();
      await app.init();
    });

    it(`/GET`, () => {
      return request(server)
        .get('/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it(`/GET (Promise/async)`, () => {
      return request(server)
        .get('/async')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it(`/GET (InternalServerError despite custom content-type)`, async () => {
      return request(server)
        .get('/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal server error',
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('Fastify', () => {
    let app: NestFastifyApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      server = app.getHttpServer();
      await app.init();
    });

    it(`/GET`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/sync',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).to.equal(HttpStatus.BAD_REQUEST);
          expect(payload).to.equal(
            JSON.stringify({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Integration test',
            }),
          );
        });
    });

    it(`/GET (Promise/async)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/sync',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).to.equal(HttpStatus.BAD_REQUEST);
          expect(payload).to.equal(
            JSON.stringify({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Integration test',
            }),
          );
        });
    });

    it(`/GET (InternalServerError despite custom content-type)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/unexpected-error',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).to.equal(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(payload).to.equal(
            JSON.stringify({
              statusCode: 500,
              message: 'Internal server error',
            }),
          );
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
