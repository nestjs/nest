import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';

describe('AudioController (e2e)', () => {
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

  describe('/audio/transcode (POST)', () => {
    it('should queue a transcoding job and return success', () => {
      return request(app.getHttpServer())
        .post('/audio/transcode')
        .expect(201);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).post('/audio/transcode').expect(201),
      );

      await Promise.all(requests);
    });

    it('should reject GET requests', () => {
      return request(app.getHttpServer())
        .get('/audio/transcode')
        .expect(404);
    });
  });
});
