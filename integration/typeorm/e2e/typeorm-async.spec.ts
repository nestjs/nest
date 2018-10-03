import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AsyncApplicationModule } from '../src/app-async.module';

describe('TypeOrm (async configuration)', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`should return created entity`, () => {
    return request(server)
      .post('/photo')
      .expect(201, { name: 'Nest', description: 'Is great!', views: 6000 });
  });

  afterEach(async () => {
    await app.close();
  });
});
