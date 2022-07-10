import { CACHE_MANAGER, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AsyncRegisterModule } from '../src/async-register/async-register.module';
import { Cache } from 'cache-manager';
import { assert } from 'chai';

describe('Async Register', () => {
  let server;
  let app: INestApplication;
  let cacheManager: Cache;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncRegisterModule],
    }).compile();

    cacheManager = module.get<Cache>(CACHE_MANAGER);
    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it('should be defined', async () => {
    assert.isDefined(cacheManager);
  });

  it(`should return empty`, async () => {
    return request(server).get('/').expect(200, 'Not found');
  });

  it(`should return data`, async () => {
    return request(server).get('/').expect(200, 'value');
  });

  after(async () => {
    await app.close();
  });
});
