import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return an array of items and cache the response', async () => {
      const start1 = Date.now();
      const first = await request(app.getHttpServer()).get('/').expect(200);
      const duration1 = Date.now() - start1;

      expect(first.body).toEqual([{ id: 1, name: 'Nest' }]);

      const start2 = Date.now();
      const second = await request(app.getHttpServer()).get('/').expect(200);
      const duration2 = Date.now() - start2;

      expect(second.body).toEqual(first.body);
      expect(duration2).toBeLessThan(duration1);
    }, 15000);

    it('should consistently return the same cached data', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).toEqual([{ id: 1, name: 'Nest' }]);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });
  });
});
