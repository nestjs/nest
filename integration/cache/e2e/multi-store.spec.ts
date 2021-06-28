import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { MultiStoreModule } from '../src/multi-store/multi-store.module';
import { INestApplication } from '@nestjs/common';

describe('Caching Multi Store', () => {
  let server;
  let app: INestApplication;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [MultiStoreModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`Should return empty`, async () => {
    return request(server)
      .get('/')
      .expect(200, '');
  });

  it(`Should return data`, async () => {
    return request(server)
      .get('/')
      .expect(200, 'multi-store-value');
  });

  after(async () => {
    await app.close();
  });
});
