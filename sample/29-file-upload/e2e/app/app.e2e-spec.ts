import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('E2E FileTest', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('should allow for file uploads', async () => {
    return request(app.getHttpServer())
      .post('/file')
      .attach('file', './package.json')
      .field('name', 'test')
      .expect(201)
      .expect({
        body: {
          name: 'test',
        },
        file: readFileSync('./package.json').toString(),
      });
  });

  it('should allow for file uploads that pass validation', async () => {
    return request(app.getHttpServer())
      .post('/file/pass-validation')
      .attach('file', './package.json')
      .field('name', 'test')
      .expect(201)
      .expect({
        body: {
          name: 'test',
        },
        file: readFileSync('./package.json').toString(),
      });
  });

  it('should throw for file uploads that do not pass validation', async () => {
    return request(app.getHttpServer())
      .post('/file/fail-validation')
      .attach('file', './package.json')
      .field('name', 'test')
      .expect(400);
  });

  it('should throw when file is required but no file is uploaded', async () => {
    return request(app.getHttpServer())
      .post('/file/fail-validation')
      .expect(400);
  });

  it('should allow for optional file uploads with validation enabled (fixes #10017)', () => {
    return request(app.getHttpServer())
      .post('/file/pass-validation')
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
