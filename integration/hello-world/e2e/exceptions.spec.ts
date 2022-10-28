import { HttpServer, HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ErrorsController } from '../src/errors/errors.controller';

describe('Error messages', () => {
  let server: HttpServer;
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
    return request(server).get('/sync').expect(HttpStatus.BAD_REQUEST).expect({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Integration test',
    });
  });

  it(`/GET (Promise/async)`, () => {
    return request(server).get('/async').expect(HttpStatus.BAD_REQUEST).expect({
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
