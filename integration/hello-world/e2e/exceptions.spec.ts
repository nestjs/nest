import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ErrorsController } from '../src/errors/errors.controller';

describe('Error messages', () => {
  let server;
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

  afterEach(async () => {
    await app.close();
  });
});
