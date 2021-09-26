import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
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

  afterAll(async () => {
    await app.close();
  });
});
