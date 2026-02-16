import * as request from 'supertest';
import { expect } from 'chai';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { ErrorsController } from '../src/errors/errors.controller';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from '../src/filters/exception.filter';

describe('Exception Filters (H3 adapter)', () => {
  describe('Default exception handling', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('/GET sync error', () => {
      return request(app.getHttpServer())
        .get('/errors/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it('/GET async error', () => {
      return request(app.getHttpServer())
        .get('/errors/async')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it('/GET not found error', () => {
      return request(app.getHttpServer())
        .get('/errors/not-found')
        .expect(HttpStatus.NOT_FOUND)
        .expect(res => {
          expect(res.body.message).to.equal('Resource not found');
          expect(res.body.statusCode).to.equal(404);
        });
    });

    it('/GET internal server error', () => {
      return request(app.getHttpServer())
        .get('/errors/internal')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect(res => {
          expect(res.body.message).to.equal('Internal server error');
          expect(res.body.statusCode).to.equal(500);
        });
    });

    it('/GET unexpected error should return 500', () => {
      return request(app.getHttpServer())
        .get('/errors/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect(res => {
          expect(res.body.statusCode).to.equal(500);
        });
    });
  });

  describe('HttpExceptionFilter', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
        providers: [
          {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply custom filter to HTTP exceptions', () => {
      return request(app.getHttpServer())
        .get('/errors/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect(res => {
          expect(res.body.custom).to.be.true;
          expect(res.body.statusCode).to.equal(400);
          expect(res.body.timestamp).to.not.be.undefined;
        });
    });
  });

  describe('AllExceptionsFilter', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
        providers: [
          {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should catch all exceptions including non-HTTP', () => {
      return request(app.getHttpServer())
        .get('/errors/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect(res => {
          expect(res.body.allExceptionsFilter).to.be.true;
          expect(res.body.statusCode).to.equal(500);
        });
    });
  });
});
