import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CustomTtlModule } from '../src/custom-ttl/custom-ttl.module';

describe('Caching Custom TTL', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [CustomTtlModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it('should return a differnt value after the TTL is elapsed', async () => {
    await request(server).get('/').expect(200, '0');
    await new Promise(resolve => setTimeout(resolve, 500));
    await request(server).get('/').expect(200, '1');
  });

  it('should return the cached value within the TTL', async () => {
    await request(server).get('/').expect(200, '0');
    await new Promise(resolve => setTimeout(resolve, 200));
    await request(server).get('/').expect(200, '0');
  });

  afterEach(async () => {
    await app.close();
  });
});
