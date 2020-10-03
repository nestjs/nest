import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('E2E FileTest', () => {
  let app: INestApplication;

  beforeAll(async() => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
      })
  });
});
