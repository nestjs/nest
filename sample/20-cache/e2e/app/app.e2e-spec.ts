import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Cache (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return cached data', async () => {
    // First request populates the cache (has 3s simulated delay)
    const firstResponse = await request(app.getHttpServer())
      .get('/')
      .expect(200);

    expect(firstResponse.body).toEqual([{ id: 1, name: 'Nest' }]);

    // Second request should return the cached response
    const secondResponse = await request(app.getHttpServer())
      .get('/')
      .expect(200);

    expect(secondResponse.body).toEqual([{ id: 1, name: 'Nest' }]);
  }, 15000);
});
