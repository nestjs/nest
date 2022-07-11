import { CACHE_MANAGER, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AsyncRegisterExtraModule } from '../src/async-register-extra-providers/async-register-extra.module';
import { Cache } from 'cache-manager';
import { assert } from 'chai';

describe('Async Register Extra Providers', () => {
  let server;
  let app: INestApplication;
  let cacheManager: Cache;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncRegisterExtraModule],
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
