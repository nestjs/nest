import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MultiStoreModule } from '../src/multi-store/multi-store.module';

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

  it(`should return empty`, async () => {
    return request(server).get('/').expect(200, '');
  });

  it(`should return data`, async () => {
    return request(server).get('/').expect(200, 'multi-store-value');
  });

  after(async () => {
    await app.close();
  });
});
