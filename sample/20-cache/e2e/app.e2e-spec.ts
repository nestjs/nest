import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

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
    it('should return items on the first (uncached) request', async () => {
      const { body } = await request(app.getHttpServer()).get('/').expect(200);
      expect(body).toEqual([{ id: 1, name: 'Nest' }]);
    });

    it('should return the same items on a subsequent (cached) request', async () => {
      const { body } = await request(app.getHttpServer()).get('/').expect(200);
      expect(body).toEqual([{ id: 1, name: 'Nest' }]);
    });
  });
});
