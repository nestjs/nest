import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CatsModule } from '../../src/cats/cats.module.js';

describe('Cats', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer()).get('/cats').expect(200).expect([]);
  });

  it(`/POST cats`, () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Pixel', age: 2, breed: 'Bombay' })
      .expect(201);
  });

  it(`/POST cats - should fail validation with invalid body`, () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Pixel', age: 'not-a-number', breed: 'Bombay' })
      .expect(400);
  });

  it(`/POST cats - should fail validation with missing fields`, () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Pixel' })
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
