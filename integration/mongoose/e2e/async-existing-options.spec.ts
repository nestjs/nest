import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AsyncOptionsExistingModule } from '../src/async-existing-options.module';

describe('Mongoose', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncOptionsExistingModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`should return created entity`, () => {
    const cat = {
      name: 'Nest',
      age: 20,
      breed: 'Awesome',
    };
    return request(server)
      .post('/cats')
      .send(cat)
      .expect(201)
      .expect(({ body }) => body.name === cat.name);
  });

  afterEach(async () => {
    await app.close();
  });
});
